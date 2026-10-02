import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { MemoryEphemeralStore, type EphemeralStore } from '@g3/platform';
import { v4 as uuid } from 'uuid';
import type { AuthSessionDto } from '@g3/contracts';
import { AuthError } from '../errors';
import type { AuthService } from '../auth.service';
import type { AuditService } from '../audit/audit.service';
import type { Clock } from '../clock';
import type { PasswordHasher } from '../password.hasher';
import type { UserRecord, UserRepo } from '../repos/in-memory.user.repo';
import { assertAdmin, auditActor, NO_META, type ActorContext, type RequestMeta } from '../security/actor';

/**
 * Envío de SMS. `companyId` es la compañía del destinatario: el proveedor
 * se resuelve por compañía (su Twilio/Vonage, el de la plataforma o el de
 * entorno). En runtime: `ProviderSmsSender` (./provider-senders).
 */
export interface SmsSender {
  send(companyId: string, toE164: string, body: string): Promise<void>;
}

/** Correo transaccional resuelto por compañía (SendGrid, Mailgun…). */
export interface EmailSender {
  send(companyId: string, to: string, subject: string, body: string): Promise<void>;
}

export class RecordingSmsSender implements SmsSender {
  readonly sent: { companyId: string; to: string; body: string }[] = [];
  async send(companyId: string, to: string, body: string) {
    this.sent.push({ companyId, to, body });
  }
}

export class RecordingEmailSender implements EmailSender {
  readonly sent: { companyId: string; to: string; subject: string; body: string }[] = [];
  async send(companyId: string, to: string, subject: string, body: string) {
    this.sent.push({ companyId, to, subject, body });
  }
}

export interface PasswordlessConfig {
  /** Vigencia del código SMS. */
  otpTtlSec: number;
  otpMaxAttempts: number;
  /** Máximo de códigos por teléfono por ventana. */
  otpMaxRequests: number;
  otpWindowSec: number;
  resetTtlSec: number;
  /** URL de Admin para restablecer (se le agrega `?token=`). */
  resetUrl: string;
  pepper: string;
}

export const DEFAULT_PASSWORDLESS: Omit<PasswordlessConfig, 'pepper' | 'resetUrl'> = {
  otpTtlSec: 300,
  otpMaxAttempts: 5,
  otpMaxRequests: 3,
  otpWindowSec: 900,
  resetTtlSec: 1800,
};

/** Código OTP vigente de un teléfono (en el store, con TTL). */
interface OtpEntry {
  userId: string;
  /** sha256(pepper:código) en hex: el código nunca se guarda en claro. */
  codeHash: string;
  expiresAt: number;
}

interface ResetEntry {
  userId: string;
  expiresAt: number;
}

const E164 = /^\+\d{10,15}$/;
const MIN_PASSWORD_LENGTH = 12;

/**
 * Acceso sin contraseña de G3 Drive y recuperación de contraseña de Admin.
 *
 * - El chofer entra con su teléfono: código de 6 dígitos por SMS, 5 min,
 *   5 intentos, 3 envíos cada 15 min. La sesión trae la claim `driverId`.
 * - Recuperación: enlace de un solo uso por correo, 30 min.
 * - Ninguna respuesta revela si el teléfono o el correo existen.
 *
 * Estado efímero (códigos, intentos, límites de envío, enlaces) en un
 * `EphemeralStore`: Redis/Memorystore en producción, compartido entre
 * réplicas, con operaciones atómicas (ventana deslizante, INCR, GETDEL).
 */
export class PasswordlessService {
  private readonly store: EphemeralStore;

  constructor(
    private readonly deps: {
      users: UserRepo;
      auth: AuthService;
      hasher: PasswordHasher;
      audit: AuditService;
      clock: Clock;
      sms: SmsSender;
      email: EmailSender;
      cfg: PasswordlessConfig;
      /** Default: memoria con el reloj inyectado (dev/tests). */
      store?: EphemeralStore;
    },
  ) {
    this.store = deps.store ?? new MemoryEphemeralStore(() => deps.clock.now());
  }

  /** Alta del acceso a G3 Drive para un chofer ya registrado en el servicio drivers. */
  async grantDriverAccess(
    actor: ActorContext,
    input: { driverId: string; phone: string; fullName: string; email?: string | null },
  ): Promise<{ userId: string; driverId: string; phone: string }> {
    assertAdmin(actor);
    const phone = normalizePhone(input.phone);
    if (!input.driverId) throw new AuthError(400, 'driverId requerido');
    const existing = await this.deps.users.findByPhone(phone);
    if (existing) throw new AuthError(409, 'Ese teléfono ya tiene acceso a G3');
    const user: UserRecord = {
      id: uuid(),
      // Los choferes no usan correo para entrar; uno sintético mantiene el índice único.
      email: input.email?.trim() || `${phone.slice(1)}@drive.g3.local`,
      // Contraseña aleatoria inutilizable: el acceso es por OTP.
      passwordHash: await this.deps.hasher.hash(randomBytes(32).toString('hex')),
      fullName: input.fullName,
      role: 'driver',
      companyId: actor.companyId,
      tier: (await this.deps.users.findById(actor.userId))?.tier ?? 'free',
      createdAt: new Date(this.deps.clock.now()).toISOString(),
      phone,
      driverId: input.driverId,
    };
    await this.deps.users.create(user);
    await this.record(actor.companyId, auditActor({ userId: actor.userId, role: actor.role }), 'user.driver_access_granted', user.id, actor, {
      driverId: input.driverId,
      phoneSuffix: phone.slice(-4),
    });
    return { userId: user.id, driverId: input.driverId, phone };
  }

  /**
   * Choferes de la compañía con acceso a G3 Drive (owner/admin/dispatcher).
   * Solo los últimos 4 dígitos del teléfono.
   */
  async listDriverAccess(actor: ActorContext): Promise<{ userId: string; driverId: string; phoneSuffix: string }[]> {
    if (!['owner', 'admin', 'dispatcher'].includes(actor.role)) {
      throw new AuthError(403, 'Solo owner, admin o dispatcher pueden ver el acceso de choferes');
    }
    const users = await this.deps.users.findByCompanyId(actor.companyId);
    return users
      .filter((u) => u.role === 'driver' && u.driverId && u.phone)
      .map((u) => ({ userId: u.id, driverId: u.driverId!, phoneSuffix: u.phone!.slice(-4) }));
  }

  /** Siempre "ok": no revela si el teléfono existe. */
  async requestOtp(rawPhone: string, meta: RequestMeta = NO_META): Promise<{ accepted: true }> {
    const phone = normalizePhone(rawPhone);
    const now = this.deps.clock.now();
    const { otpWindowSec, otpMaxRequests, otpTtlSec } = this.deps.cfg;
    // Ventana deslizante atómica (Lua en Redis): réplicas distintas cuentan juntas.
    const { count } = await this.store.slidingHit(`otp:requests:${phone}`, now, otpWindowSec * 1000);
    if (count > otpMaxRequests) {
      throw new AuthError(429, 'Demasiados códigos solicitados. Intenta en unos minutos.');
    }

    const user = await this.deps.users.findByPhone(phone);
    if (!user || user.role !== 'driver') return { accepted: true };

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const entry: OtpEntry = { userId: user.id, codeHash: this.hash(code).toString('hex'), expiresAt: now + otpTtlSec * 1000 };
    // Un código nuevo reemplaza al anterior y reinicia los intentos.
    await this.store.set(`otp:code:${phone}`, JSON.stringify(entry), otpTtlSec * 1000);
    await this.store.del(`otp:attempts:${phone}`);
    await this.deps.sms.send(user.companyId, phone, `G3 Drive: tu código es ${code}. Vence en ${Math.round(otpTtlSec / 60)} min. No lo compartas.`);
    await this.record(user.companyId, auditActor({ userId: user.id, role: user.role }), 'auth.otp.requested', user.id, meta, {});
    return { accepted: true };
  }

  async verifyOtp(rawPhone: string, code: string, meta: RequestMeta = NO_META): Promise<AuthSessionDto> {
    const phone = normalizePhone(rawPhone);
    const codeKey = `otp:code:${phone}`;
    const entry = parse<OtpEntry>(await this.store.get(codeKey));
    const now = this.deps.clock.now();
    const max = this.deps.cfg.otpMaxAttempts;
    if (!entry || entry.expiresAt < now) throw new AuthError(401, 'Código inválido o vencido');
    // Cada intento se reserva con INCR antes de comparar: intentos en paralelo
    // (o en réplicas distintas) no pueden rebasar el máximo.
    const attempt = await this.store.incr(`otp:attempts:${phone}`, Math.max(1, entry.expiresAt - now));
    if (attempt > max) throw new AuthError(401, 'Código inválido o vencido');
    const given = this.hash(String(code ?? '').trim());
    if (!timingSafeEqual(given, Buffer.from(entry.codeHash, 'hex'))) {
      const user = await this.deps.users.findById(entry.userId);
      if (user) {
        await this.record(user.companyId, auditActor({ userId: user.id, role: user.role }), 'auth.otp.failed', user.id, meta, {
          remainingAttempts: max - attempt,
        });
      }
      throw new AuthError(401, 'Código inválido o vencido');
    }
    // Uso único (GETDEL): si otra petición ya lo consumió, no hay sesión.
    if (!(await this.store.take(codeKey))) throw new AuthError(401, 'Código inválido o vencido');
    await this.store.del(`otp:attempts:${phone}`);
    const user = await this.deps.users.findById(entry.userId);
    if (!user) throw new AuthError(401, 'Código inválido o vencido');
    await this.record(user.companyId, auditActor({ userId: user.id, role: user.role }), 'auth.login.succeeded', user.id, meta, {
      method: 'otp_sms',
    });
    return this.deps.auth.sessionFor(user);
  }

  /** Siempre "ok": no revela si el correo existe. */
  async requestPasswordReset(email: string, meta: RequestMeta = NO_META): Promise<{ accepted: true }> {
    const user = await this.deps.users.findByEmail(String(email ?? '').trim());
    if (!user || user.role === 'driver') return { accepted: true };
    const token = randomBytes(32).toString('base64url');
    // Solo el hash del token: un dump de Redis no sirve para restablecer.
    const reset: ResetEntry = { userId: user.id, expiresAt: this.deps.clock.now() + this.deps.cfg.resetTtlSec * 1000 };
    await this.store.set(`pwreset:${this.hash(token).toString('hex')}`, JSON.stringify(reset), this.deps.cfg.resetTtlSec * 1000);
    await this.deps.email.send(
      user.companyId,
      user.email,
      'Restablece tu contraseña de G3',
      `Abre este enlace en los próximos ${Math.round(this.deps.cfg.resetTtlSec / 60)} min: ${this.deps.cfg.resetUrl}?token=${token}\nSi no lo pediste, ignora este correo.`,
    );
    await this.record(user.companyId, auditActor({ userId: user.id, role: user.role }), 'auth.password_reset.requested', user.id, meta, {});
    return { accepted: true };
  }

  async resetPassword(token: string, newPassword: string, meta: RequestMeta = NO_META): Promise<{ ok: true }> {
    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new AuthError(400, `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    }
    const key = `pwreset:${this.hash(String(token ?? '')).toString('hex')}`;
    // Un solo uso (GETDEL): se consume aunque falle por vencido.
    const entry = parse<ResetEntry>(await this.store.take(key));
    if (!entry || entry.expiresAt < this.deps.clock.now()) throw new AuthError(400, 'Enlace inválido o vencido');
    const user = await this.deps.users.findById(entry.userId);
    if (!user) throw new AuthError(400, 'Enlace inválido o vencido');
    await this.deps.users.updatePassword(user.id, await this.deps.hasher.hash(newPassword));
    await this.record(user.companyId, auditActor({ userId: user.id, role: user.role }), 'auth.password_reset.completed', user.id, meta, {});
    return { ok: true };
  }

  private hash(v: string): Buffer {
    return createHash('sha256').update(`${this.deps.cfg.pepper}:${v}`).digest();
  }

  private record(
    companyId: string,
    actor: ReturnType<typeof auditActor>,
    action: Parameters<AuditService['record']>[0]['action'],
    resourceId: string,
    meta: RequestMeta,
    metadata: Record<string, unknown>,
  ) {
    return this.deps.audit.record({
      companyId,
      actor,
      action,
      resource: { type: 'user', id: resourceId },
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata,
    });
  }
}

function parse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function normalizePhone(raw: string): string {
  const p = String(raw ?? '').replace(/[\s()-]/g, '');
  if (!E164.test(p)) throw new AuthError(400, 'El teléfono debe ir en formato internacional, p.ej. +5215512345678');
  return p;
}
