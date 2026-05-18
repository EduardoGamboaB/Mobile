export interface DomainEvent {
  type: string;
  occurredAt: string;
  companyId: string;
  data: Record<string, unknown>;
}
export interface EventBus { publish(e: DomainEvent): Promise<void>; }
export class RecordingEventBus implements EventBus {
  events: DomainEvent[] = [];
  async publish(e: DomainEvent) { this.events.push(e); }
}
