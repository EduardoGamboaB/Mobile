/**
 * Errores de dominio del centro de incidentes, con `status` HTTP y `toJSON()`
 * para que `HttpErrorFilter` los traduzca (mismo patrón que fleet).
 */
export class DomainError extends Error {
  constructor(
    readonly status: number,
    readonly error: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }

  toJSON() {
    return { statusCode: this.status, error: this.error, message: this.message };
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(400, 'Bad Request', message);
  }
}
export class UnauthorizedError extends DomainError {
  constructor(message: string) {
    super(401, 'Unauthorized', message);
  }
}
export class ForbiddenError extends DomainError {
  constructor(message = 'Sin permiso para esta operación') {
    super(403, 'Forbidden', message);
  }
}
export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(404, 'Not Found', message);
  }
}
export class ConflictError extends DomainError {
  constructor(message: string) {
    super(409, 'Conflict', message);
  }
}
