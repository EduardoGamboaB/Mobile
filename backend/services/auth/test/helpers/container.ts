import { randomBytes } from 'crypto';
import type { AuthSessionDto, UserRole } from '@g3/contracts';
import { isMfaChallenge, type LoginResultDto } from '@g3/contracts';
import { buildAuthContainer, type AuthContainerOptions } from '../../src/container';
import { ManualClock } from '../../src/clock';
import { base32Decode, totp } from '../../src/mfa/totp';
import { HmacTestSignatureVerifier, StaticOidcDiscovery, StubTokenExchanger } from '../../src/sso/oidc';

export const PASSWORD = 'super-secret-password-min-12chars';
export const META = { ip: '201.10.20.30', userAgent: 'jest-agent' };
export const IDP_TEST_KEY = 'idp-test-signing-key-32-bytes-long!!';

/** `overrides`: repos de Postgres y/o store de Redis para las pruebas de integración. */
export function buildTestContainer(overrides: Pick<AuthContainerOptions, 'repos' | 'ephemeral'> & { now?: number } = {}) {
  const clock = new ManualClock(overrides.now ?? Date.parse('2026-10-01T12:00:00Z'));
  const exchanger = new StubTokenExchanger();
  const c = buildAuthContainer({
    clock,
    repos: overrides.repos,
    ephemeral: overrides.ephemeral,
    bcryptRounds: 4,
    jwt: { accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), accessTtlSec: 3600, refreshTtlSec: 86400 },
    mfaTokenSecret: 'm'.repeat(32),
    mfaEncryptionKey: randomBytes(32),
    recoveryPepper: 'p'.repeat(32),
    sso: {
      redirectUri: 'https://admin.g3.test/login/sso/callback',
      discovery: new StaticOidcDiscovery(),
      exchanger,
      signatureVerifier: new HmacTestSignatureVerifier(IDP_TEST_KEY),
      secrets: { resolve: async (ref: string) => `secret-for:${ref}` },
    },
  });
  return { ...c, clock, exchanger };
}

export type TestContainer = ReturnType<typeof buildTestContainer>;

export async function registerOwner(c: TestContainer, email = 'owner@acme.mx') {
  return c.auth.registerCompany({
    companyName: 'Transportes Acme',
    contactEmail: email,
    ownerName: 'Pedro Pérez',
    password: PASSWORD,
  });
}

export async function addUser(c: TestContainer, companyId: string, email: string, role: UserRole) {
  const passwordHash = await c.hasher.hash(PASSWORD);
  return c.users.create({
    id: `usr_${email}`,
    email,
    passwordHash,
    fullName: email,
    role,
    companyId,
    tier: 'free',
    createdAt: new Date(c.clock.now()).toISOString(),
  });
}

/** Enrola MFA para un usuario ya existente y devuelve secreto + códigos. */
export async function enrollMfa(c: TestContainer, userId: string) {
  const user = (await c.users.findById(userId))!;
  const { secret } = await c.mfa.beginEnrollment(user);
  const { recoveryCodes } = await c.mfa.confirmEnrollment(user, codeFor(c, secret), META);
  // avanzamos un paso para que el próximo código no sea "replay"
  c.clock.advance(30_000);
  return { secret, recoveryCodes };
}

export function codeFor(c: TestContainer, secret: string): string {
  return totp(base32Decode(secret), c.clock.now());
}

export function expectSession(r: LoginResultDto): AuthSessionDto {
  if (isMfaChallenge(r)) throw new Error('Se esperaba sesión y llegó reto MFA');
  return r;
}

export function actorOf(user: { id: string; companyId: string; role: UserRole }) {
  return { userId: user.id, companyId: user.companyId, role: user.role, ...META };
}
