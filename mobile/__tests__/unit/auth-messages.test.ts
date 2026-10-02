/**
 * Mensajes de los flujos OTP y recuperación de contraseña: claros, sin
 * revelar si el teléfono/correo existe, y con el 429 explicado.
 */
import { G3ApiError } from '@/api/g3/types';
import { authApi } from '@/api/g3/auth';
import { tokenStore } from '@/api/g3/client';
import {
  PASSWORD_RESET_SENT,
  authErrorMessage,
  otpSentHint,
  formatWait,
} from '@/utils/authMessages';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

const apiError = (status: number, extra: Record<string, unknown> = {}) =>
  new G3ApiError(status, { statusCode: status, error: 'x', message: 'mensaje del servidor', ...extra });

describe('authMessages', () => {
  test('429 en cualquier flujo: explica el límite y, si viene, cuánto esperar', () => {
    const otp = authErrorMessage(apiError(429, { retryAfterSeconds: 120 }), 'otp_request');
    expect(otp.title).toMatch(/Demasiados/);
    expect(otp.message).toContain('2 min');

    const generic = authErrorMessage(apiError(429), 'password_forgot');
    expect(generic.title).toMatch(/Demasiados/);
    expect(generic.message).toMatch(/unos minutos/);

    expect(authErrorMessage(apiError(429, { retryAfterSeconds: 30 }), 'otp_verify').message).toContain('30 s');
  });

  test('código incorrecto o vencido (401) en la verificación OTP', () => {
    const m = authErrorMessage(apiError(401), 'otp_verify');
    expect(m.title).toBe('Código incorrecto');
    expect(m.message).toMatch(/vencido|nuevo/);
  });

  test('sin red: mensaje de conexión, no el TypeError crudo', () => {
    const m = authErrorMessage(new TypeError('Network request failed'), 'otp_request');
    expect(m.message).toMatch(/conexión/i);
  });

  test('400 de teléfono inválido y errores del servidor', () => {
    expect(authErrorMessage(apiError(400), 'otp_request').message).toMatch(/número/);
    expect(authErrorMessage(apiError(503), 'password_forgot').message).toMatch(/intenta/i);
  });

  test('los textos de éxito no revelan si la cuenta existe', () => {
    for (const text of [PASSWORD_RESET_SENT.message, otpSentHint('+525512345678')]) {
      expect(text).toMatch(/^Si /);
      expect(text).not.toMatch(/no existe|no encontr|no registrad/i);
    }
    expect(otpSentHint('+525512345678')).toContain('+525512345678');
  });

  test('formatWait', () => {
    expect(formatWait(5)).toBe('5 s');
    expect(formatWait(60)).toBe('1 min');
    expect(formatWait(61)).toBe('2 min');
  });
});

describe('authApi: OTP y recuperación contra el backend', () => {
  let teardown: () => void;
  beforeEach(() => tokenStore.setInMemory(null));
  afterEach(() => teardown?.());

  test('otp/request responde 202 sin cuerpo y no falla', async () => {
    const m = makeFetchMock().on('POST /api/auth/otp/request', { status: 202, body: { accepted: true } });
    teardown = installGlobalFetchMock(m);
    await expect(authApi.requestOtp('+525512345678')).resolves.toBeUndefined();
    expect(m.calls[0].body).toEqual({ phone: '+525512345678' });
  });

  test('otp/request 429 (gateway) llega como G3ApiError con retryAfterSeconds', async () => {
    const m = makeFetchMock().on('POST /api/auth/otp/request', {
      status: 429,
      body: { statusCode: 429, error: 'Too Many Requests', message: 'Demasiados intentos.', retryAfterSeconds: 90 },
      headers: { 'retry-after': '90' },
    });
    teardown = installGlobalFetchMock(m);
    const err = await authApi.requestOtp('+525512345678').catch((e) => e);
    expect(err).toBeInstanceOf(G3ApiError);
    expect((err as G3ApiError).status).toBe(429);
    expect(authErrorMessage(err, 'otp_request').message).toContain('2 min');
  });

  test('password/forgot 202 → ok', async () => {
    const m = makeFetchMock().on('POST /api/auth/password/forgot', { status: 202, body: { accepted: true } });
    teardown = installGlobalFetchMock(m);
    await expect(authApi.forgotPassword('quien@sea.mx')).resolves.toBeUndefined();
    expect(m.calls[0].body).toEqual({ email: 'quien@sea.mx' });
  });
});
