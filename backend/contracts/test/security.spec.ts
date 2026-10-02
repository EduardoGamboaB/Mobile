import { isMfaChallenge, MFA_MANDATORY_ROLES, AUDIT_ACTIONS } from '../src';

describe('contracts/security', () => {
  test('isMfaChallenge distingue reto MFA de sesión completa', () => {
    expect(
      isMfaChallenge({ mfaRequired: true, mfaToken: 't', expiresInSec: 300, mfaEnrollmentRequired: false }),
    ).toBe(true);
    expect(
      isMfaChallenge({
        accessToken: 'a',
        refreshToken: 'r',
        user: { id: 'u', email: 'e', role: 'owner', companyId: 'c', tier: 'free' },
      }),
    ).toBe(false);
    expect(isMfaChallenge(null)).toBe(false);
  });

  test('owner y admin siempre requieren MFA', () => {
    expect(MFA_MANDATORY_ROLES).toEqual(expect.arrayContaining(['owner', 'admin']));
  });

  test('catálogo de acciones de auditoría cubre los eventos exigidos', () => {
    for (const a of [
      'auth.login.succeeded',
      'auth.login.failed',
      'auth.mfa.enrolled',
      'auth.mfa.disabled',
      'auth.mfa.recovery_code_used',
      'user.role_changed',
      'expense_policy.updated',
      'sso_config.updated',
    ]) {
      expect(AUDIT_ACTIONS).toContain(a);
    }
  });
});
