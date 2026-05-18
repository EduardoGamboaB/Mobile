import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert, AlertSeverity, AlertSource } from './alert.entity';
import { EventsService } from '../events/events.service';

interface CreateAlertInput {
  companyId: string;
  source: AlertSource;
  entityId: string;
  entityLabel: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
}

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert) private readonly repo: Repository<Alert>,
    private readonly events: EventsService,
  ) {}

  list(companyId: string, opts?: { acknowledged?: boolean }) {
    return this.repo.find({
      where: { companyId, ...(opts?.acknowledged !== undefined ? { acknowledged: opts.acknowledged } : {}) },
      order: { createdAt: 'DESC' },
    });
  }

  async create(input: CreateAlertInput) {
    const a = await this.repo.save(this.repo.create(input));
    await this.events.publishAlert(input);
    return a;
  }

  async acknowledge(companyId: string, id: string) {
    const a = await this.repo.findOne({ where: { id, companyId } });
    if (!a) throw new NotFoundException('Alerta no encontrada');
    a.acknowledged = true;
    a.acknowledgedAt = new Date();
    return this.repo.save(a);
  }
}
