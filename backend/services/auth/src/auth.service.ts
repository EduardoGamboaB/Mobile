import { v4 as uuid } from 'uuid';
import { Tier, type TierValue } from '@g3/contracts';
import type {
  AuthSessionDto,
  LoginDto,
  RefreshDto,
  RegisterCompanyDto,
} from '@g3/contracts';
import type { PasswordHasher } from './password.hasher';
import type { JwtTokenIssuer } from './token.issuer';
import type { EventBus } from './event.bus';
import type { UserRepo } from './repos/in-memory.user.repo';
import type { CompanyRepo } from './repos/in-memory.company.repo';

const MIN_PASSWORD_LENGTH = 12;

export class AuthService {
  constructor(
    private readonly users: UserRepo,
    private readonly companies: CompanyRepo,
    private readonly hasher: PasswordHasher,
    private readonly tokens: JwtTokenIssuer,
    private readonly bus: EventBus,
  ) {}

  async registerCompany(input: RegisterCompanyDto): Promise<AuthSessionDto> {
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
    }
    if (await this.users.findByEmail(input.contactEmail)) {
      throw new Error('Ese correo ya existe en G3');
    }

    const now = new Date().toISOString();
    const companyId = uuid();
    await this.companies.create({
      id: companyId,
      name: input.companyName,
      rfc: input.rfc ?? null,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone ?? null,
      createdAt: now,
    });

    const userId = uuid();
    const passwordHash = await this.hasher.hash(input.password);
    await this.users.create({
      id: userId,
      email: input.contactEmail,
      passwordHash,
      fullName: input.ownerName,
      role: 'owner',
      companyId,
      tier: Tier.Free,
      createdAt: now,
    });

    await this.bus.publish({
      type: 'auth.company_registered',
      occurredAt: now,
      companyId,
      data: { companyName: input.companyName, ownerEmail: input.contactEmail },
    });

    return this.buildSession({
      id: userId,
      email: input.contactEmail,
      role: 'owner',
      companyId,
      tier: Tier.Free,
    });
  }

  async login(input: LoginDto): Promise<AuthSessionDto> {
    const user = await this.users.findByEmail(input.email);
    const fakeHash = '$2a$04$00000000000000000000000000000000000000000000000000000';
    // verificar siempre — evita timing attack que enumera emails
    const ok = user
      ? await this.hasher.verify(input.password, user.passwordHash)
      : await this.hasher.verify(input.password, fakeHash);
    if (!user || !ok) {
      throw new Error('Credenciales incorrectas');
    }
    return this.buildSession({
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      tier: user.tier,
    });
  }

  async refresh(input: RefreshDto): Promise<AuthSessionDto> {
    const { sub } = this.tokens.verifyRefresh(input.refreshToken);
    const user = await this.users.findById(sub);
    if (!user) throw new Error('Sesión inválida');
    return this.buildSession({
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      tier: user.tier,
    });
  }

  /** Llamado desde el subscriber de Pub/Sub cuando billing emite subscription.upgraded */
  async applyTier(companyId: string, tier: TierValue): Promise<void> {
    await this.users.updateTierForCompany(companyId, tier);
  }

  private buildSession(user: {
    id: string;
    email: string;
    role: AuthSessionDto['user']['role'];
    companyId: string;
    tier: TierValue;
  }): AuthSessionDto {
    const tokens = this.tokens.issue({
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      tier: user.tier,
    });
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    };
  }
}
