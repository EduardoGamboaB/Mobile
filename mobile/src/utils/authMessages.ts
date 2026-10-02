import { G3ApiError } from '@/api/g3/types';

/**
 * Textos de los flujos públicos de acceso (OTP por SMS y recuperación de
 * contraseña). Regla: nunca revelar si un teléfono o correo existe; el
 * backend responde 202 siempre y la app tampoco lo distingue.
 */

export type AuthFlow = 'otp_request' | 'otp_verify' | 'password_forgot';

export interface AuthMessage {
  title: string;
  message: string;
}

export const PASSWORD_RESET_SENT: AuthMessage = {
  title: 'Revisa tu correo',
  message:
    'Si el correo corresponde a una cuenta de G3, te enviaremos un enlace para restablecer tu contraseña. ' +
    'Revisa también la carpeta de spam. Si eres chofer, entra con tu número de teléfono.',
};

/** Texto de la pantalla de verificación tras pedir el código. */
export function otpSentHint(phone: string): string {
  return `Si el número ${phone} está dado de alta en G3, recibirás un SMS con un código de 6 dígitos.`;
}

export function formatWait(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.ceil(seconds))} s`;
  return `${Math.ceil(seconds / 60)} min`;
}

const isNetworkError = (e: unknown) =>
  e instanceof TypeError || (e instanceof Error && /network|failed to fetch|timeout/i.test(e.message));

export function authErrorMessage(e: unknown, flow: AuthFlow): AuthMessage {
  if (e instanceof G3ApiError) {
    if (e.status === 429) {
      const wait = e.body?.retryAfterSeconds;
      const when =
        typeof wait === 'number' && wait > 0 ? `Intenta de nuevo en ${formatWait(wait)}.` : 'Intenta de nuevo en unos minutos.';
      const what =
        flow === 'otp_request'
          ? 'Pediste varios códigos seguidos.'
          : flow === 'otp_verify'
            ? 'Hubo demasiados intentos con este código.'
            : 'Hubo demasiadas solicitudes de recuperación.';
      return { title: 'Demasiados intentos', message: `${what} ${when}` };
    }
    if (flow === 'otp_verify' && (e.status === 401 || e.status === 400)) {
      return {
        title: 'Código incorrecto',
        message: 'El código no es válido o ya venció. Revisa el SMS o pide un código nuevo.',
      };
    }
    if (flow === 'otp_request' && e.status === 400) {
      return { title: 'Teléfono inválido', message: 'Revisa el número: 10 dígitos con lada (ej. 55 1234 5678).' };
    }
    if (flow === 'password_forgot' && e.status === 400) {
      return { title: 'Correo inválido', message: 'Revisa el correo que escribiste.' };
    }
    if (e.status >= 500) {
      return { title: 'Servicio no disponible', message: 'Tuvimos un problema de nuestro lado. Intenta de nuevo en un momento.' };
    }
  }
  if (isNetworkError(e)) {
    return { title: 'Sin conexión', message: 'No pudimos conectar con G3. Revisa tu conexión e intenta de nuevo.' };
  }
  const fallback =
    flow === 'otp_request' ? 'No se pudo enviar el código' : flow === 'otp_verify' ? 'No se pudo verificar' : 'No se pudo enviar';
  return { title: fallback, message: 'Intenta de nuevo en un momento.' };
}
