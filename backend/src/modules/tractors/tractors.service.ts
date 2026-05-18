import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tractor } from './tractor.entity';
import { CreateTractorDto, UpdateTractorDto } from './dto/tractor.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { TIER_LIMITS } from '../../shared/tiers';

@Injectable()
export class TractorsService {
  constructor(
    @InjectRepository(Tractor) private readonly repo: Repository<Tractor>,
    private readonly subs: SubscriptionsService,
  ) {}

  list(companyId: string) {
    return this.repo.find({ where: { companyId }, order: { number: 'ASC' } });
  }

  async findOne(companyId: string, id: string) {
    const t = await this.repo.findOne({ where: { id, companyId } });
    if (!t) throw new NotFoundException('Tracto no encontrado');
    return t;
  }

  async create(companyId: string, dto: CreateTractorDto) {
    const sub = await this.subs.getActiveByCompany(companyId);
    const limit = TIER_LIMITS[sub.tier].units;
    if (limit != null) {
      const count = await this.repo.count({ where: { companyId } });
      if (count >= limit) {
        throw new BadRequestException(
          `Tu plan ${sub.tier} permite máximo ${limit} unidades. Mejora tu plan para agregar más.`,
        );
      }
    }
    return this.repo.save(this.repo.create({ ...dto, companyId }));
  }

  async update(companyId: string, id: string, dto: UpdateTractorDto) {
    await this.findOne(companyId, id);
    await this.repo.update({ id, companyId }, dto);
    return this.findOne(companyId, id);
  }

  async remove(companyId: string, id: string) {
    const t = await this.findOne(companyId, id);
    await this.repo.delete({ id: t.id, companyId });
  }
}
