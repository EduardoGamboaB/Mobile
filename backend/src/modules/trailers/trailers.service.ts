import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trailer } from './trailer.entity';
import { CreateTrailerDto, UpdateTrailerDto } from './dto/trailer.dto';

@Injectable()
export class TrailersService {
  constructor(@InjectRepository(Trailer) private readonly repo: Repository<Trailer>) {}

  list(companyId: string) {
    return this.repo.find({ where: { companyId }, order: { number: 'ASC' } });
  }
  async findOne(companyId: string, id: string) {
    const r = await this.repo.findOne({ where: { id, companyId } });
    if (!r) throw new NotFoundException('Remolque no encontrado');
    return r;
  }
  create(companyId: string, dto: CreateTrailerDto) {
    return this.repo.save(this.repo.create({ ...dto, companyId, capacityTons: dto.capacityTons?.toString() } as Partial<Trailer>));
  }
  async update(companyId: string, id: string, dto: UpdateTrailerDto) {
    await this.findOne(companyId, id);
    await this.repo.update({ id, companyId }, { ...dto, capacityTons: dto.capacityTons?.toString() } as Partial<Trailer>);
    return this.findOne(companyId, id);
  }
  async remove(companyId: string, id: string) {
    const r = await this.findOne(companyId, id);
    await this.repo.delete({ id: r.id, companyId });
  }
}
