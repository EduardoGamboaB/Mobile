import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './company.entity';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company) private readonly repo: Repository<Company>,
  ) {}

  create(dto: CreateCompanyDto): Promise<Company> {
    return this.repo.save(this.repo.create({ ...dto, active: true }));
  }

  async findOne(id: string): Promise<Company> {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Compañía no encontrada');
    return c;
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async setStripeCustomer(id: string, stripeCustomerId: string): Promise<void> {
    await this.repo.update(id, { stripeCustomerId });
  }
}
