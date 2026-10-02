/**
 * Composition root del auth-service: arma repos, MFA, auditoría, política
 * de seguridad y SSO. Lo usan `main.ts` (runtime) y los tests.
 */
import { AuthService } from './auth.service';
import { BcryptPasswordHasher } from './password.hasher';
import { JwtTokenIssuer, type TokenIssuerConfig } from './token.issuer';
import { MemoryEphemeralStore, type EphemeralStore } from '@g3/platform';
import { InMemoryUserRepo, type UserRepo } from './repos/in-memory.user.repo';
import { InMemoryCompanyRepo, type CompanyRepo } from './repos/in-memory.company.repo';
import { RecordingEventBus, type EventBus } from './event.bus';
import { systemClock, type Clock } from './clock';
import { InMemoryAuditRepo, type AuditRepo } from './audit/audit.repo';
import { AuditService } from './audit/audit.service';
import { InMemorySecurityPolicyRepo, SecurityPolicyService, type SecurityPolicyRepo } from './security/security-policy';
import { InMemoryMfaRepo, type MfaRepo } from './mfa/mfa.repo';
import { MfaService } from './mfa/mfa.service';
import { MfaChallengeService } from './mfa/mfa-challenge';
import { AesGcmSecretCipher } from './mfa/secret-cipher';
import { RecoveryCodeHasher } from './mfa/recovery-codes';
import { SsoService } from './sso/sso.service';
import { EphemeralSsoStateStore, InMemorySsoConfigRepo, type SsoConfigRepo } from './sso/sso.repos';
import type { IdTokenSignatureVerifier, OidcDiscovery, SecretResolver, TokenExchanger } from './sso/oidc';
import {
  DEFAULT_PASSWORDLESS,
  PasswordlessService,
  RecordingEmailSender,
  RecordingSmsSender,
  type EmailSender,
  type SmsSender,
} from './passwordless/passwordless.service';

/** Repos durables. Sin ellos se usan los de memoria (dev/tests). */
export interface AuthRepos {
  users: UserRepo;
  companies: CompanyRepo;
  audit: AuditRepo;
  policies: SecurityPolicyRepo;
  mfa: MfaRepo;
  ssoConfigs: SsoConfigRepo;
}

export interface AuthContainerOptions {
  clock?: Clock;
  /** Postgres en runtime (`main.ts`); memoria si se omite. */
  repos?: Partial<AuthRepos>;
  /**
   * Estado efímero compartido entre réplicas: retos MFA, `state` SSO, OTP,
   * límites de envío y enlaces de recuperación. Redis en producción;
   * por defecto memoria con el reloj inyectado.
   */
  ephemeral?: EphemeralStore;
  bcryptRounds?: number;
  jwt: TokenIssuerConfig;
  /** Secreto de firma del mfaToken — distinto de JWT_ACCESS_SECRET. */
  mfaTokenSecret: string;
  /** Llave AES-256 (32 bytes) para cifrar secretos TOTP en reposo. */
  mfaEncryptionKey: Buffer;
  /** Pepper HMAC de los códigos de recuperación. */
  recoveryPepper: string;
  mfaIssuer?: string;
  bus?: EventBus;
  /** OTP SMS de choferes y recuperación de contraseña. */
  passwordless?: { sms?: SmsSender; email?: EmailSender; pepper?: string; resetUrl?: string };
  sso: {
    redirectUri: string;
    discovery: OidcDiscovery;
    exchanger: TokenExchanger;
    signatureVerifier: IdTokenSignatureVerifier;
    secrets: SecretResolver;
  };
}

export function buildAuthContainer(o: AuthContainerOptions) {
  const clock = o.clock ?? systemClock;
  const ephemeral = o.ephemeral ?? new MemoryEphemeralStore(() => clock.now());
  const users = o.repos?.users ?? new InMemoryUserRepo();
  const companies = o.repos?.companies ?? new InMemoryCompanyRepo();
  const hasher = new BcryptPasswordHasher(o.bcryptRounds ?? 12);
  const tokens = new JwtTokenIssuer(o.jwt);
  const bus = o.bus ?? new RecordingEventBus();

  const auditRepo = o.repos?.audit ?? new InMemoryAuditRepo();
  const audit = new AuditService(auditRepo, clock);
  const policies = new SecurityPolicyService(o.repos?.policies ?? new InMemorySecurityPolicyRepo(), audit, clock);
  const mfaRepo = o.repos?.mfa ?? new InMemoryMfaRepo();
  const mfa = new MfaService(
    mfaRepo,
    new AesGcmSecretCipher(o.mfaEncryptionKey),
    new RecoveryCodeHasher(o.recoveryPepper),
    policies,
    audit,
    clock,
    o.mfaIssuer ?? 'G3 Admin',
  );
  const challenges = new MfaChallengeService({ secret: o.mfaTokenSecret, ttlSec: 300, maxAttempts: 5 }, clock, ephemeral);
  const auth = new AuthService(users, companies, hasher, tokens, bus, { mfa, challenges, policies, audit });

  const ssoConfigs = o.repos?.ssoConfigs ?? new InMemorySsoConfigRepo();
  const sso = new SsoService({
    configs: ssoConfigs,
    states: new EphemeralSsoStateStore(ephemeral),
    discovery: o.sso.discovery,
    exchanger: o.sso.exchanger,
    signatureVerifier: o.sso.signatureVerifier,
    secrets: o.sso.secrets,
    users,
    companies,
    hasher,
    auth,
    audit,
    clock,
    redirectUri: o.sso.redirectUri,
  });

  const sms = o.passwordless?.sms ?? new RecordingSmsSender();
  const email = o.passwordless?.email ?? new RecordingEmailSender();
  const passwordless = new PasswordlessService({
    users,
    auth,
    hasher,
    audit,
    clock,
    sms,
    email,
    store: ephemeral,
    cfg: {
      ...DEFAULT_PASSWORDLESS,
      pepper: o.passwordless?.pepper ?? o.recoveryPepper,
      resetUrl: o.passwordless?.resetUrl ?? 'https://admin.g3logistics.mx/login/reset',
    },
  });

  return {
    clock,
    ephemeral,
    users,
    companies,
    hasher,
    tokens,
    bus,
    auditRepo,
    audit,
    policies,
    mfaRepo,
    mfa,
    challenges,
    auth,
    ssoConfigs,
    sso,
    passwordless,
    sms,
    email,
  };
}

export type AuthContainer = ReturnType<typeof buildAuthContainer>;
