import { v4 as uuid } from 'uuid';
import type { AlertDto, TierValue } from '@g3/contracts';
import type { AlertRepo } from './in-memory.alert.repo';
import type { EventBus } from './event.bus';

export interface RequestCtx { companyId: string; tier: TierValue; }

export interface CreateAlertInput {
  level: AlertDto['level'];
  type: AlertDto['type'];
  message: string;
}

export class AlertsService {
  constructor(private readonly repo: AlertRepo, private readonly bus: EventBus) {}

  list(ctx: RequestCtx, filter: { resolved?: boolean; level?: AlertDto['level'] } = {}) {
    return this.repo.list(ctx.companyId, filter);
  }

  async create(ctx: RequestCtx, input: CreateAlertInput): Promise<AlertDto> {
    const a: AlertDto = {
      id: uuid(),
      companyId: ctx.companyId,
      level: input.level,
      type: input.type,
      message: input.message,
      resolved: false,
      createdAt: new Date().toISOString(),
    };
    const saved = await this.repo.create(a);
    await this.bus.publish({
      type: 'alert.raised',
      occurredAt: new Date().toISOString(),
      companyId: ctx.companyId,
      data: { alertId: saved.id, level: saved.level, type: saved.type, message: saved.message },
    });
    return saved;
  }

  async resolve(ctx: RequestCtx, id: string): Promise<AlertDto> {
    const updated = await this.repo.update(ctx.companyId, id, { resolved: true });
    if (!updated) throw new Error('Alerta no encontrada');
    await this.bus.publish({
      type: 'alert.resolved',
      occurredAt: new Date().toISOString(),
      companyId: ctx.companyId,
      data: { alertId: id },
    });
    return updated;
  }
}
