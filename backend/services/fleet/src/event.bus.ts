/**
 * Event bus abstracto (mismo patrón que auth/alerts/ai). En prod publica a
 * Pub/Sub (`g3-domain-events`); en tests/local usamos `RecordingEventBus`.
 */
export interface DomainEvent {
  type: string;
  occurredAt: string;
  companyId: string;
  data: Record<string, unknown>;
}

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
}

export class RecordingEventBus implements EventBus {
  events: DomainEvent[] = [];
  async publish(event: DomainEvent): Promise<void> {
    this.events.push(event);
  }
}

/** Bus para correr local sin Pub/Sub: no acumula eventos (evita fuga de memoria). */
export class NoopEventBus implements EventBus {
  async publish(): Promise<void> {
    /* sin Pub/Sub configurado */
  }
}
