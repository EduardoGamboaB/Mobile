import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubSub } from '@google-cloud/pubsub';

/**
 * Bus de eventos de dominio. En producción publica a Cloud Pub/Sub que
 * dispara:
 *   - Cloud Function `scoring-recalc` → BigQuery + Vertex AI
 *   - Cloud Function `notifier` → push notifications, WhatsApp, email
 *   - BigQuery sink directo via subscription Pull → tabla de eventos
 *
 * En dev/test sin GCP_PROJECT_ID, sólo se loguea.
 */
@Injectable()
export class EventsService implements OnModuleInit {
  private readonly logger = new Logger(EventsService.name);
  private pubsub: PubSub | null = null;
  private topicEvents = '';
  private topicAlerts = '';

  constructor(private readonly cfg: ConfigService) {}

  onModuleInit() {
    const projectId = this.cfg.get<string>('GCP_PROJECT_ID');
    this.topicEvents = this.cfg.get<string>('PUBSUB_TOPIC_EVENTS', 'g3-domain-events');
    this.topicAlerts = this.cfg.get<string>('PUBSUB_TOPIC_ALERTS', 'g3-alerts');
    if (projectId) {
      this.pubsub = new PubSub({ projectId });
      this.logger.log(`Pub/Sub habilitado · project=${projectId}`);
    } else {
      this.logger.warn('GCP_PROJECT_ID no configurado — eventos en modo log-only');
    }
  }

  async publishDomainEvent(type: string, payload: Record<string, unknown>): Promise<void> {
    const event = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      v: 1,
    };
    if (!this.pubsub) {
      this.logger.debug(`[event] ${type} ${JSON.stringify(payload)}`);
      return;
    }
    try {
      await this.pubsub.topic(this.topicEvents).publishMessage({
        json: event,
        attributes: { type },
      });
    } catch (err) {
      this.logger.error(`Fallo publicando ${type}`, err as Error);
    }
  }

  async publishAlert(payload: {
    companyId: string;
    source: 'tractor' | 'trailer' | 'driver' | 'trip' | 'document';
    entityId: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    detail: string;
  }): Promise<void> {
    if (!this.pubsub) {
      this.logger.debug(`[alert] ${payload.title}`);
      return;
    }
    await this.pubsub.topic(this.topicAlerts).publishMessage({
      json: payload,
      attributes: {
        companyId: payload.companyId,
        severity: payload.severity,
        source: payload.source,
      },
    });
  }
}
