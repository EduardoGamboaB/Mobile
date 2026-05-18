import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';

interface CreateUserInput {
  companyId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(input: CreateUserInput): Promise<User> {
    return this.repo.save(this.repo.create(input));
  }

  listByCompany(companyId: string): Promise<User[]> {
    return this.repo.find({
      where: { companyId, active: true },
      order: { fullName: 'ASC' },
    });
  }
}
