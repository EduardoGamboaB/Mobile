/**
 * Event bus abstracto. En prod publica a Pub/Sub; en tests usamos
 * `RecordingEventBus` para assertar efectos colaterales.
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
