import type { DomainEvent, EventBus } from './event.bus';

/**
 * Adapter a Google Cloud Pub/Sub. La librería real (`@google-cloud/pubsub`)
 * se carga dinámicamente para no fallar en entornos sin GCP. Si no está
 * instalada o falta el proyecto, hace fallback a log.
 */
export class PubSubEventBus implements EventBus {
  private client: { topic(name: string): { publishMessage(msg: { data: Buffer }): Promise<string> } } | null = null;
  private readonly topic = process.env.PUBSUB_TOPIC ?? 'g3-domain-events';
  private readonly project = process.env.GCP_PROJECT_ID;

  private async getClient() {
    if (this.client) return this.client;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PubSub } = require('@google-cloud/pubsub');
      this.client = new PubSub({ projectId: this.project });
      return this.client;
    } catch {
      return null;
    }
  }

  async publish(event: DomainEvent): Promise<void> {
    const client = await this.getClient();
    if (!client) {
      // eslint-disable-next-line no-console
      console.log(`[pubsub:stub] ${event.type}`, event);
      return;
    }
    const payload = Buffer.from(JSON.stringify(event));
    await client.topic(this.topic).publishMessage({ data: payload });
  }
}
