import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterCompanyDto, RefreshTokenDto } from './dto/auth.dto';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { Tier } from '../../shared/tiers';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
    @Inject(forwardRef(() => UsersService))
    private readonly users: UsersService,
    @Inject(forwardRef(() => CompaniesService))
    private readonly companies: CompaniesService,
    @Inject(forwardRef(() => SubscriptionsService))
    private readonly subscriptions: SubscriptionsService,
  ) {}

  /** Onboarding: crea compañía + usuario owner + suscripción Free. */
  async registerCompany(dto: RegisterCompanyDto) {
    const exists = await this.users.findByEmail(dto.email);
    if (exists) throw new ConflictException('Correo ya registrado');

    const company = await this.companies.create({
      name: dto.companyName,
      rfc: dto.rfc ?? null,
    });
    const owner = await this.users.create({
      companyId: company.id,
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, 10),
      fullName: dto.ownerName,
      role: 'owner',
    });
    await this.subscriptions.startTrial(company.id, Tier.Free);

    return this.issueTokens(owner.id, company.id, owner.role, Tier.Free);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    const sub = await this.subscriptions.getActiveByCompany(user.companyId);
    return this.issueTokens(user.id, user.companyId, user.role, sub.tier);
  }

  async refresh(dto: RefreshTokenDto) {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify(dto.refreshToken, {
        secret: this.cfg.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    // Re-leemos el tier por si cambió desde el último login.
    const sub = await this.subscriptions.getActiveByCompany(payload.companyId);
    return this.issueTokens(payload.sub, payload.companyId, payload.role, sub.tier);
  }

  private issueTokens(
    userId: string,
    companyId: string,
    role: JwtPayload['role'],
    tier: JwtPayload['tier'],
  ) {
    const payload: JwtPayload = { sub: userId, companyId, role, tier };
    return {
      accessToken: this.jwt.sign(payload),
      refreshToken: this.jwt.sign(payload, {
        secret: this.cfg.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.cfg.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
      }),
      user: { id: userId, companyId, role, tier },
    };
  }
}
