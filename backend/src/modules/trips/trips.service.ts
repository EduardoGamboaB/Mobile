import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip, TripStatus } from './trip.entity';
import { CreateTripDto } from './dto/trip.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { EventsService } from '../events/events.service';
import { TIER_LIMITS } from '../../shared/tiers';

const NEXT: Record<TripStatus, TripStatus | null> = {
  scheduled: 'loading',
  loading: 'in_transit',
  in_transit: 'unloading',
  unloading: 'finished',
  finished: null,
  cancelled: null,
};

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip) private readonly repo: Repository<Trip>,
    private readonly subs: SubscriptionsService,
    private readonly events: EventsService,
  ) {}

  list(companyId: string) {
    return this.repo.find({
      where: { companyId },
      order: { loadDate: 'DESC' },
    });
  }
  async findOne(companyId: string, id: string) {
    const t = await this.repo.findOne({ where: { id, companyId } });
    if (!t) throw new NotFoundException('Viaje no encontrado');
    return t;
  }

  private async generateFolio(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.repo.count({ where: { companyId } });
    return `G3-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  async create(companyId: string, dto: CreateTripDto) {
    const sub = await this.subs.getActiveByCompany(companyId);
    const limit = TIER_LIMITS[sub.tier].tripsPerMonth;
    if (limit != null) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const count = await this.repo
        .createQueryBuilder('t')
        .where('t.companyId = :c', { c: companyId })
        .andWhere('t.createdAt >= :s', { s: monthStart.toISOString() })
        .getCount();
      if (count >= limit) {
        throw new BadRequestException(
          `Tu plan ${sub.tier} permite ${limit} viajes por mes. Mejora tu plan para continuar.`,
        );
      }
    }
    const gross = dto.tons * dto.pricePerTon;
    const trip = await this.repo.save(
      this.repo.create({
        ...dto,
        companyId,
        folio: await this.generateFolio(companyId),
        loadDate: new Date(dto.loadDate),
        etaUnload: dto.etaUnload ? new Date(dto.etaUnload) : null,
        tons: String(dto.tons),
        pricePerTon: String(dto.pricePerTon),
        grossAmount: String(gross),
        driverCommission: String(Math.round(gross * 0.1 * 100) / 100),
        status: 'scheduled',
      } as Partial<Trip>),
    );
    await this.events.publishDomainEvent('trip.created', {
      companyId, tripId: trip.id, folio: trip.folio,
      driverId: trip.driverId, tractorId: trip.tractorId,
    });
    return trip;
  }

  async advanceStatus(companyId: string, id: string, next: TripStatus) {
    const trip = await this.findOne(companyId, id);
    const allowed = NEXT[trip.status];
    if (allowed !== next && next !== 'cancelled') {
      throw new BadRequestException(`Transición inválida ${trip.status} → ${next}`);
    }
    trip.status = next;
    if (next === 'finished') trip.finishedAt = new Date();
    if (next === 'finished') trip.paymentStatus = 'pending';
    const saved = await this.repo.save(trip);
    await this.events.publishDomainEvent('trip.status_changed', {
      companyId, tripId: trip.id, from: trip.status, to: next,
    });
    return saved;
  }

  async releasePayment(companyId: string, id: string) {
    const trip = await this.findOne(companyId, id);
    if (trip.paymentStatus !== 'pending') {
      throw new BadRequestException(`No se puede liberar pago en estatus ${trip.paymentStatus}`);
    }
    trip.paymentStatus = 'released';
    const saved = await this.repo.save(trip);
    await this.events.publishDomainEvent('trip.payment_released', {
      companyId, tripId: id, amount: trip.driverCommission,
    });
    return saved;
  }
}
