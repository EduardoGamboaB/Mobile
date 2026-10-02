import { DriversService } from '../src/drivers.service';
import { InMemoryDriverRepo } from '../src/in-memory.driver.repo';
import { TierLimitExceededError } from '@g3/contracts';

const ctx = (tier: 'free' | 'starter' | 'pro' | 'business' | 'enterprise' = 'free') => ({
  companyId: 'cmp_1',
  tier,
});

function build() {
  const repo = new InMemoryDriverRepo();
  const svc = new DriversService(repo);
  return { svc, repo };
}

describe('DriversService', () => {
  test('list devuelve sólo drivers del companyId del request', async () => {
    const { svc, repo } = build();
    await repo.create({
      id: 'd1',
      companyId: 'cmp_1',
      fullName: 'Pedro',
      phone: '+52555',
      email: null,
      federalLicense: null,
      licenseExpiresAt: null,
      status: 'active',
      createdAt: '2026-01-01',
    });
    await repo.create({
      id: 'd2',
      companyId: 'OTRA_CIA',
      fullName: 'Otro',
      phone: '+52666',
      email: null,
      federalLicense: null,
      licenseExpiresAt: null,
      status: 'active',
      createdAt: '2026-01-01',
    });

    const list = await svc.list(ctx());
    expect(list).toHaveLength(1);
    expect(list[0].fullName).toBe('Pedro');
  });

  test('create con tier free permite 1 driver y rechaza el segundo', async () => {
    const { svc } = build();
    await svc.create(ctx('free'), { fullName: 'A', phone: '+1' });
    await expect(svc.create(ctx('free'), { fullName: 'B', phone: '+2' })).rejects.toBeInstanceOf(
      TierLimitExceededError,
    );
  });

  test('create con tier starter permite 2 drivers', async () => {
    const { svc } = build();
    await svc.create(ctx('starter'), { fullName: 'A', phone: '+1' });
    await svc.create(ctx('starter'), { fullName: 'B', phone: '+2' });
    await expect(svc.create(ctx('starter'), { fullName: 'C', phone: '+3' })).rejects.toBeInstanceOf(
      TierLimitExceededError,
    );
  });

  test('update parchea sólo los campos enviados', async () => {
    const { svc } = build();
    const d = await svc.create(ctx('starter'), { fullName: 'A', phone: '+1' });
    const updated = await svc.update(ctx('starter'), d.id, { status: 'inactive' });
    expect(updated.status).toBe('inactive');
    expect(updated.fullName).toBe('A');
  });

  test('update bloquea cambios a drivers de OTRA compañía', async () => {
    const { svc, repo } = build();
    await repo.create({
      id: 'ext',
      companyId: 'cmp_OTRA',
      fullName: 'X',
      phone: '+1',
      email: null,
      federalLicense: null,
      licenseExpiresAt: null,
      status: 'active',
      createdAt: '2026-01-01',
    });
    await expect(svc.update(ctx(), 'ext', { status: 'inactive' })).rejects.toThrow(/no encontrado/i);
  });

  test('remove devuelve 204 implícito (void)', async () => {
    const { svc } = build();
    const d = await svc.create(ctx('starter'), { fullName: 'A', phone: '+1' });
    await expect(svc.remove(ctx('starter'), d.id)).resolves.toBeUndefined();
    await expect(svc.get(ctx('starter'), d.id)).rejects.toThrow(/no encontrado/i);
  });
});

describe('DriversService · perfil del chofer (G3 Drive)', () => {
  test('getMine devuelve el chofer vinculado al JWT', async () => {
    const { svc } = build();
    const d = await svc.create(ctx('starter'), { fullName: 'Juan', phone: '+5255' });
    const me = await svc.getMine({ ...ctx('starter'), driverId: d.id });
    expect(me.fullName).toBe('Juan');
    await expect(svc.getMine(ctx('starter'))).rejects.toThrow(/chofer/i);
  });

  test('updateMine solo cambia teléfono y correo', async () => {
    const { svc } = build();
    const d = await svc.create(ctx('starter'), { fullName: 'Juan', phone: '+5255', federalLicense: 'B-1' });
    const me = await svc.updateMine({ ...ctx('starter'), driverId: d.id }, {
      phone: '+5299',
      fullName: 'Hackeado',
      federalLicense: 'X',
    } as never);
    expect(me.phone).toBe('+5299');
    expect(me.fullName).toBe('Juan');
    expect(me.federalLicense).toBe('B-1');
  });
});

