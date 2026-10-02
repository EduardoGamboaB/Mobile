/**
 * Política de seguridad por compañía. Hoy: `requireMfaForRoles`.
 * owner y admin SIEMPRE requieren MFA (MFA_MANDATORY_ROLES) — la política
 * solo puede agregar roles, nunca quitar los obligatorios.
 */
import {
  MFA_MANDATORY_ROLES,
  type SecurityPolicyDto,
  type UpdateSecurityPolicyDto,
  type UserRole,
} from '@g3/contracts';
import type { Clock } from '../clock';
import { AuthError } from '../errors';
import type { AuditService } from '../audit/audit.service';
import { ALL_ROLES, assertAdmin, auditActor, type ActorContext } from './actor';

export interface SecurityPolicyRepo {
  find(companyId: string): Promise<SecurityPolicyDto | null>;
  save(p: SecurityPolicyDto): Promise<void>;
}

export class InMemorySecurityPolicyRepo implements SecurityPolicyRepo {
  private readonly byCompany = new Map<string, SecurityPolicyDto>();
  async find(companyId: string) {
    const p = this.byCompany.get(companyId);
    return p ? structuredClone(p) : null;
  }
  async save(p: SecurityPolicyDto) {
    this.byCompany.set(p.companyId, structuredClone(p));
  }
}

function normalizeRoles(roles: UserRole[]): UserRole[] {
  const set = new Set<UserRole>([...MFA_MANDATORY_ROLES, ...roles]);
  return ALL_ROLES.filter((r) => set.has(r));
}

export class SecurityPolicyService {
  constructor(
    private readonly repo: SecurityPolicyRepo,
    private readonly audit: AuditService,
    private readonly clock: Clock,
  ) {}

  async get(companyId: string): Promise<SecurityPolicyDto> {
    const stored = await this.repo.find(companyId);
    if (stored) return { ...stored, requireMfaForRoles: normalizeRoles(stored.requireMfaForRoles) };
    return { companyId, requireMfaForRoles: normalizeRoles([]), updatedAt: new Date(0).toISOString() };
  }

  async requiresMfa(companyId: string, role: UserRole): Promise<boolean> {
    return (await this.get(companyId)).requireMfaForRoles.includes(role);
  }

  async update(actor: ActorContext, dto: UpdateSecurityPolicyDto): Promise<SecurityPolicyDto> {
    assertAdmin(actor);
    if (!Array.isArray(dto?.requireMfaForRoles) || dto.requireMfaForRoles.some((r) => !ALL_ROLES.includes(r))) {
      throw new AuthError(400, 'requireMfaForRoles contiene roles inválidos');
    }
    const before = await this.get(actor.companyId);
    const next: SecurityPolicyDto = {
      companyId: actor.companyId,
      requireMfaForRoles: normalizeRoles(dto.requireMfaForRoles),
      updatedAt: new Date(this.clock.now()).toISOString(),
    };
    await this.repo.save(next);
    await this.audit.record({
      companyId: actor.companyId,
      actor: auditActor(actor),
      action: 'security_policy.updated',
      resource: { type: 'security_policy', id: actor.companyId },
      ip: actor.ip,
      userAgent: actor.userAgent,
      metadata: {
        before: { requireMfaForRoles: before.requireMfaForRoles },
        after: { requireMfaForRoles: next.requireMfaForRoles },
      },
    });
    return next;
  }
}
