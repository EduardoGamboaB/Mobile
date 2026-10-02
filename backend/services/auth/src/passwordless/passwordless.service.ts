import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { v4 as uuid } from 'uuid';
import type { AuthSessionDto } from '@g3/contracts';
import { AuthError } from '../errors';
import type { AuthService } from '../auth.service';
import type { AuditService } from '../audit/audit.service';
import type { Clock } from '../clock';
import type { PasswordHasher } from '../password.hasher';
import type { UserRecord, UserRepo } from '../repos/in-memory.user.repo';
import { assertAdmin, auditActor, NO_META, type ActorContext, type RequestMeta } from '../security/actor';

/** Envío de SMS (Twilio, Vonage, AWS SNS…). */
export interface SmsSender {
  send(toE164: string, body: string): Promise<void>;
}

/** Envío de correo transaccional (SendGrid, SES…). */
export interface EmailSender {
  send(to: string, subject: string, body: string): Promise<void>;
}

export class RecordingSmsSender implements SmsSender {
  readonly sent: { to: string; body: string }[] = [];
  async send(to: string, body: string) {
    this.sent.push({ to, body });
  }
}

export class RecordingEmailSender implements EmailSender {
  readonly sent: { to: string; subject: string; body: string }[] = [];
  async send(to: string, subject: string, body: string) {
    this.sent.push({ to, subject, body });
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

interface OtpEntry {
  userId: string;
  codeHash: Buffer;
  expiresAt: number;
  attempts: number;
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
 * Estado en memoria: en producción va a Redis/Memorystore (ver
 * security/08-pentest-scope.md §10), igual que los retos MFA.
 */
export class PasswordlessService {
  private readonly otps = new Map<string, OtpEntry>();
  private readonly otpRequests = new Map<string, number[]>();
  private readonly resets = new Map<string, ResetEntry>();

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
    },
  ) {}

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

  /** Siempre "ok": no revela si el teléfono existe. */
  async requestOtp(rawPhone: string, meta: RequestMeta = NO_META): Promise<{ accepted: true }> {
    const phone = normalizePhone(rawPhone);
    const now = this.deps.clock.now();
    const { otpWindowSec, otpMaxRequests, otpTtlSec } = this.deps.cfg;
    const recent = (this.otpRequests.get(phone) ?? []).filter((t) => now - t < otpWindowSec * 1000);
    if (recent.length >= otpMaxRequests) {
      throw new AuthError(429, 'Demasiados códigos solicitados. Intenta en unos minutos.');
    }
    this.otpRequests.set(phone, [...recent, now]);

    const user = await this.deps.users.findByPhone(phone);
    if (!user || user.role !== 'driver') return { accepted: true };

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    this.otps.set(phone, { userId: user.id, codeHash: this.hash(code), expiresAt: now + otpTtlSec * 1000, attempts: 0 });
    await this.deps.sms.send(phone, `G3 Drive: tu código es ${code}. Vence en ${Math.round(otpTtlSec / 60)} min. No lo compartas.`);
    await this.record(user.companyId, auditActor({ userId: user.id, role: user.role }), 'auth.otp.requested', user.id, meta, {});
    return { accepted: true };
  }

  async verifyOtp(rawPhone: string, code: string, meta: RequestMeta = NO_META): Promise<AuthSessionDto> {
    const phone = normalizePhone(rawPhone);
    const entry = this.otps.get(phone);
    const now = this.deps.clock.now();
    if (!entry || entry.expiresAt < now || entry.attempts >= this.deps.cfg.otpMaxAttempts) {
      throw new AuthError(401, 'Código inválido o vencido');
    }
    const given = this.hash(String(code ?? '').trim());
    if (!timingSafeEqual(given, entry.codeHash)) {
      entry.attempts += 1;
      const user = await this.deps.users.findById(entry.userId);
      if (user) {
        await this.record(user.companyId, auditActor({ userId: user.id, role: user.role }), 'auth.otp.failed', user.id, meta, {
          remainingAttempts: this.deps.cfg.otpMaxAttempts - entry.attempts,
        });
      }
      throw new AuthError(401, 'Código inválido o vencido');
    }
    this.otps.delete(phone);
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
    this.resets.set(this.hash(token).toString('hex'), {
      userId: user.id,
      expiresAt: this.deps.clock.now() + this.deps.cfg.resetTtlSec * 1000,
    });
    await this.deps.email.send(
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
    const key = this.hash(String(token ?? '')).toString('hex');
    const entry = this.resets.get(key);
    // Un solo uso: se consume aunque falle por vencido.
    this.resets.delete(key);
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

export function normalizePhone(raw: string): string {
  const p = String(raw ?? '').replace(/[\s()-]/g, '');
  if (!E164.test(p)) throw new AuthError(400, 'El teléfono debe ir en formato internacional, p.ej. +5215512345678');
  return p;
}
