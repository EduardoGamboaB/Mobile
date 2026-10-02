/**
 * Errores de dominio del servicio fleet. Llevan `status` HTTP y `toJSON()`
 * con la misma forma que los errores de @g3/contracts, para que
 * `HttpErrorFilter` los traduzca sin acoplar el servicio a Nest.
 */
export class DomainError extends Error {
  constructor(
    readonly status: number,
    readonly error: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
  }

  toJSON() {
    return { statusCode: this.status, error: this.error, message: this.message, ...(this.details ?? {}) };
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, 'Bad Request', message, details);
  }
}

export class UnsupportedProviderError extends DomainError {
  constructor(provider: string) {
    super(400, 'Bad Request', `Proveedor de telemetría no soportado: ${provider}`, { provider });
  }
}

export class InvalidIngestTokenError extends DomainError {
  constructor() {
    super(401, 'Unauthorized', 'Token de ingesta inválido o revocado');
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string) {
    super(403, 'Forbidden', message);
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(404, 'Not Found', message);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(409, 'Conflict', message, details);
  }
}
