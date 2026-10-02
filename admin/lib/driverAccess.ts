/**
 * Acceso de choferes a G3 Drive (servicio auth · `POST /users/drivers`).
 * El chofer entra con su teléfono y un código SMS (OTP); no usa contraseña.
 * Respuestas: 201 {userId, driverId, phone}; 409 teléfono ya registrado;
 * 403 si quien lo pide no es owner/admin.
 */
import { api } from './api/client';
import { isLive } from './api/config';
import { G3ApiError } from './api/types';

export interface GrantDriverAccessInput {
  driverId: string;
  phone: string;
  fullName: string;
  email?: string | null;
}

export interface DriverAccessGrant {
  userId: string;
  driverId: string;
  phone: string;
}

export interface DriverAccessBackend {
  grant(input: GrantDriverAccessInput): Promise<DriverAccessGrant>;
  /** Acceso ya otorgado (demo: en memoria; con backend: los dados desde este navegador). */
  grantedFor(driverId: string): DriverAccessGrant | null;
}

/** Quita espacios, guiones y paréntesis; no inventa lada. */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, '');
}

export function isE164(phone: string): boolean {
  return /^\+\d{10,15}$/.test(phone);
}

export function phoneError(raw: string): string | null {
  const p = normalizePhone(raw);
  if (!p) return 'Captura el teléfono del chofer';
  if (!isE164(p)) return 'Formato E.164 con lada de país, p.ej. +5215512345678';
  return null;
}

/** Mensaje claro para los errores conocidos del endpoint. */
export function driverAccessErrorMessage(e: unknown): string {
  if (e instanceof G3ApiError) {
    if (e.status === 409) return 'Ese teléfono ya tiene acceso a G3 (está ligado a otro usuario).';
    if (e.status === 403) return 'Solo el dueño (owner) o un admin de la compañía pueden dar acceso a G3 Drive.';
    if (e.status === 400) return e.message || 'Datos inválidos';
    return e.message;
  }
  return e instanceof Error ? e.message : String(e);
}

const CACHE_KEY = 'g3admin.driverAccess.v1';

function readCache(): Record<string, DriverAccessGrant> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    return JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, DriverAccessGrant>;
  } catch {
    return {};
  }
}

function writeCache(g: DriverAccessGrant) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...readCache(), [g.driverId]: g }));
  } catch {
    /* sin almacenamiento: solo se pierde el recordatorio local */
  }
}

function payload(input: GrantDriverAccessInput) {
  const body: Record<string, string> = {
    driverId: input.driverId,
    phone: normalizePhone(input.phone),
    fullName: input.fullName.trim(),
  };
  if (input.email?.trim()) body.email = input.email.trim();
  return body;
}

export const driverAccessHttp: DriverAccessBackend = {
  async grant(input) {
    const r = await api.post<DriverAccessGrant>('/users/drivers', payload(input));
    writeCache(r);
    return r;
  },
  grantedFor: (driverId) => readCache()[driverId] ?? null,
};

/** Demo: mismas reglas (E.164, 409 por teléfono repetido, 403 si no es admin). */
export function createDemoDriverAccess(opts: { isAdmin?: boolean; taken?: string[] } = {}): DriverAccessBackend & {
  phones(): string[];
} {
  const byDriver = new Map<string, DriverAccessGrant>();
  // El teléfono del dueño ya es usuario de G3.
  const phones = new Set<string>(opts.taken ?? ['+525500000001']);
  let seq = 0;
  return {
    phones: () => [...phones],
    async grant(input) {
      if (opts.isAdmin === false) {
        throw new G3ApiError(403, { statusCode: 403, error: 'Forbidden', message: 'Requiere rol owner o admin' });
      }
      const body = payload(input);
      if (!body.driverId) throw new G3ApiError(400, { statusCode: 400, error: 'Bad Request', message: 'driverId requerido' });
      if (!isE164(body.phone)) {
        throw new G3ApiError(400, { statusCode: 400, error: 'Bad Request', message: 'Teléfono inválido (E.164)' });
      }
      if (phones.has(body.phone)) {
        throw new G3ApiError(409, { statusCode: 409, error: 'Conflict', message: 'Ese teléfono ya tiene acceso a G3' });
      }
      const g: DriverAccessGrant = { userId: `usr_drv_${(seq++).toString(36)}`, driverId: body.driverId, phone: body.phone };
      phones.add(body.phone);
      byDriver.set(body.driverId, g);
      return { ...g };
    },
    grantedFor: (driverId) => {
      const g = byDriver.get(driverId);
      return g ? { ...g } : null;
    },
  };
}

export const driverAccessBackend: DriverAccessBackend = isLive ? driverAccessHttp : createDemoDriverAccess();
