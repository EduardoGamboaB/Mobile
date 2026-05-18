import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from './driver.entity';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { TIER_LIMITS } from '../../shared/tiers';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver) private readonly repo: Repository<Driver>,
    private readonly subs: SubscriptionsService,
  ) {}

  list(companyId: string) {
    return this.repo.find({ where: { companyId }, order: { fullName: 'ASC' } });
  }

  async findOne(companyId: string, id: string) {
    const d = await this.repo.findOne({ where: { id, companyId } });
    if (!d) throw new NotFoundException('Operador no encontrado');
    return d;
  }

  async create(companyId: string, dto: CreateDriverDto) {
    // Enforcement de límites por tier (operadores ~ usuarios del producto)
    const sub = await this.subs.getActiveByCompany(companyId);
    const limit = TIER_LIMITS[sub.tier].users;
    if (limit != null) {
      const count = await this.repo.count({ where: { companyId } });
      if (count >= limit) {
        throw new BadRequestException(
          `Tu plan ${sub.tier} permite máximo ${limit} operadores. Mejora tu plan para agregar más.`,
        );
      }
    }
    return this.repo.save(this.repo.create({ ...dto, companyId }));
  }

  async update(companyId: string, id: string, dto: UpdateDriverDto) {
    await this.findOne(companyId, id);
    await this.repo.update({ id, companyId }, dto);
    return this.findOne(companyId, id);
  }

  async remove(companyId: string, id: string) {
    const d = await this.findOne(companyId, id);
    await this.repo.update({ id: d.id, companyId }, { status: 'inactive' });
  }
}
