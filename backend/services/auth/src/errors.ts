/**
 * Error de dominio con status HTTP. Los controllers lo traducen a
 * `HttpException`; el mensaje es apto para el cliente (sin detalles internos).
 */
export class AuthError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}
