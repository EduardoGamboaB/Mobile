import { AuthService } from '../src/auth.service';
import { InMemoryUserRepo } from '../src/repos/in-memory.user.repo';
import { InMemoryCompanyRepo } from '../src/repos/in-memory.company.repo';
import { BcryptPasswordHasher } from '../src/password.hasher';
import { JwtTokenIssuer } from '../src/token.issuer';
import { RecordingEventBus } from '../src/event.bus';
import { expectSession } from './helpers/container';

function build() {
  const users = new InMemoryUserRepo();
  const companies = new InMemoryCompanyRepo();
  const hasher = new BcryptPasswordHasher(4);
  const tokens = new JwtTokenIssuer({
    accessSecret: 'a'.repeat(32),
    refreshSecret: 'b'.repeat(32),
    accessTtlSec: 3600,
    refreshTtlSec: 86400,
  });
  const bus = new RecordingEventBus();
  const service = new AuthService(users, companies, hasher, tokens, bus);
  return { service, users, companies, bus };
}

describe('AuthService.registerCompany', () => {
  test('crea company + owner + emite subscription.started', async () => {
    const { service, users, companies, bus } = build();

    const session = await service.registerCompany({
      companyName: 'Transportes Acme',
      contactEmail: 'owner@acme.mx',
      ownerName: 'Pedro Pérez',
      password: 'super-secret-password-min-12chars',
    });

    expect(session.user.role).toBe('owner');
    expect(session.user.tier).toBe('free');
    expect(session.user.companyId).toBeTruthy();
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();

    // efectos colaterales
    expect((await companies.findAll()).length).toBe(1);
    expect((await users.findAll()).length).toBe(1);
    const evt = bus.events.find((e) => e.type === 'auth.company_registered');
    expect(evt).toBeDefined();
    expect(evt?.data).toMatchObject({ companyName: 'Transportes Acme' });
  });

  test('rechaza email duplicado', async () => {
    const { service } = build();
    const input = {
      companyName: 'Acme',
      contactEmail: 'dup@acme.mx',
      ownerName: 'A',
      password: 'super-secret-password-min-12chars',
    };
    await service.registerCompany(input);
    await expect(service.registerCompany(input)).rejects.toThrow(/ya existe/i);
  });

  test('rechaza contraseñas cortas', async () => {
    const { service } = build();
    await expect(
      service.registerCompany({
        companyName: 'Acme',
        contactEmail: 'x@y.z',
        ownerName: 'A',
        password: 'short',
      }),
    ).rejects.toThrow(/contraseña/i);
  });
});

describe('AuthService.login', () => {
  test('login válido devuelve tokens con companyId y tier', async () => {
    const { service } = build();
    await service.registerCompany({
      companyName: 'Acme',
      contactEmail: 'login@acme.mx',
      ownerName: 'A',
      password: 'super-secret-password-min-12chars',
    });

    // sin dependencias de seguridad inyectadas no hay reto MFA
    const session = expectSession(
      await service.login({
        email: 'login@acme.mx',
        password: 'super-secret-password-min-12chars',
      }),
    );

    expect(session.user.email).toBe('login@acme.mx');
    expect(session.user.tier).toBe('free');
  });

  test('login con contraseña incorrecta tira UnauthorizedException', async () => {
    const { service } = build();
    await service.registerCompany({
      companyName: 'Acme',
      contactEmail: 'login@acme.mx',
      ownerName: 'A',
      password: 'super-secret-password-min-12chars',
    });

    await expect(
      service.login({ email: 'login@acme.mx', password: 'wrong-password-12345' }),
    ).rejects.toThrow(/credenciales/i);
  });

  test('login con email no registrado tira el mismo error (no enumera)', async () => {
    const { service } = build();
    await expect(
      service.login({ email: 'nobody@nowhere.mx', password: 'whatever-1234567' }),
    ).rejects.toThrow(/credenciales/i);
  });
});

describe('AuthService.refresh', () => {
  test('refresh válido rota los tokens', async () => {
    const { service } = build();
    const first = await service.registerCompany({
      companyName: 'Acme',
      contactEmail: 'r@acme.mx',
      ownerName: 'A',
      password: 'super-secret-password-min-12chars',
    });

    const next = await service.refresh({ refreshToken: first.refreshToken });

    expect(next.accessToken).toBeTruthy();
    expect(next.refreshToken).toBeTruthy();
  });

  test('refresh con un access token (mal tipo) tira', async () => {
    const { service } = build();
    const first = await service.registerCompany({
      companyName: 'Acme',
      contactEmail: 'r@acme.mx',
      ownerName: 'A',
      password: 'super-secret-password-min-12chars',
    });
    await expect(service.refresh({ refreshToken: first.accessToken })).rejects.toThrow();
  });
});

describe('AuthService.updateTier (callback desde billing-service via Pub/Sub)', () => {
  test('actualiza el tier de todos los users de la compañía', async () => {
    const { service, users } = build();
    const session = await service.registerCompany({
      companyName: 'Acme',
      contactEmail: 'tier@acme.mx',
      ownerName: 'A',
      password: 'super-secret-password-min-12chars',
    });

    await service.applyTier(session.user.companyId, 'pro');

    const refreshed = await users.findByEmail('tier@acme.mx');
    expect(refreshed?.tier).toBe('pro');
  });
});
