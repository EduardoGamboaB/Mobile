/**
 * Composition root del auth-service: arma repos, MFA, auditoría, política
 * de seguridad y SSO. Lo usan `main.ts` (runtime) y los tests.
 */
import { AuthService } from './auth.service';
import { BcryptPasswordHasher } from './password.hasher';
import { JwtTokenIssuer, type TokenIssuerConfig } from './token.issuer';
import { InMemoryUserRepo } from './repos/in-memory.user.repo';
import { InMemoryCompanyRepo } from './repos/in-memory.company.repo';
import { RecordingEventBus, type EventBus } from './event.bus';
import { systemClock, type Clock } from './clock';
import { InMemoryAuditRepo } from './audit/audit.repo';
import { AuditService } from './audit/audit.service';
import { InMemorySecurityPolicyRepo, SecurityPolicyService } from './security/security-policy';
import { InMemoryMfaRepo } from './mfa/mfa.repo';
import { MfaService } from './mfa/mfa.service';
import { MfaChallengeService } from './mfa/mfa-challenge';
import { AesGcmSecretCipher } from './mfa/secret-cipher';
import { RecoveryCodeHasher } from './mfa/recovery-codes';
import { SsoService } from './sso/sso.service';
import { InMemorySsoConfigRepo, InMemorySsoStateStore } from './sso/sso.repos';
import type { IdTokenSignatureVerifier, OidcDiscovery, SecretResolver, TokenExchanger } from './sso/oidc';

export interface AuthContainerOptions {
  clock?: Clock;
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
  const users = new InMemoryUserRepo();
  const companies = new InMemoryCompanyRepo();
  const hasher = new BcryptPasswordHasher(o.bcryptRounds ?? 12);
  const tokens = new JwtTokenIssuer(o.jwt);
  const bus = o.bus ?? new RecordingEventBus();

  const auditRepo = new InMemoryAuditRepo();
  const audit = new AuditService(auditRepo, clock);
  const policies = new SecurityPolicyService(new InMemorySecurityPolicyRepo(), audit, clock);
  const mfaRepo = new InMemoryMfaRepo();
  const mfa = new MfaService(
    mfaRepo,
    new AesGcmSecretCipher(o.mfaEncryptionKey),
    new RecoveryCodeHasher(o.recoveryPepper),
    policies,
    audit,
    clock,
    o.mfaIssuer ?? 'G3 Admin',
  );
  const challenges = new MfaChallengeService({ secret: o.mfaTokenSecret, ttlSec: 300, maxAttempts: 5 }, clock);
  const auth = new AuthService(users, companies, hasher, tokens, bus, { mfa, challenges, policies, audit });

  const ssoConfigs = new InMemorySsoConfigRepo();
  const sso = new SsoService({
    configs: ssoConfigs,
    states: new InMemorySsoStateStore(),
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

  return {
    clock,
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
  };
}

export type AuthContainer = ReturnType<typeof buildAuthContainer>;
