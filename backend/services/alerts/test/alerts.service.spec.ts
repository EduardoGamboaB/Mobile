import { AlertsService } from '../src/alerts.service';
import { InMemoryAlertRepo } from '../src/in-memory.alert.repo';
import { RecordingEventBus } from '../src/event.bus';

const ctx = { companyId: 'cmp_1', tier: 'free' as const };

function build() {
  const repo = new InMemoryAlertRepo();
  const bus = new RecordingEventBus();
  const svc = new AlertsService(repo, bus);
  return { svc, repo, bus };
}

describe('AlertsService', () => {
  test('create publica al topic g3-alerts (no a g3-domain-events)', async () => {
    const { svc, bus } = build();
    const a = await svc.create(ctx, { level: 'critical', type: 'sos', message: 'SOS' });
    expect(a.resolved).toBe(false);
    expect(bus.events).toHaveLength(1);
    expect(bus.events[0].type).toBe('alert.raised');
    expect(bus.events[0].data).toMatchObject({ alertId: a.id, level: 'critical' });
  });

  test('list por nivel y resolved=false', async () => {
    const { svc } = build();
    const a1 = await svc.create(ctx, { level: 'info', type: 'other', message: 'i' });
    await svc.create(ctx, { level: 'warning', type: 'late_arrival', message: 'w' });
    await svc.resolve(ctx, a1.id);

    const open = await svc.list(ctx, { resolved: false });
    expect(open).toHaveLength(1);
    expect(open[0].level).toBe('warning');
  });

  test('resolve marca resolved=true y emite alert.resolved', async () => {
    const { svc, bus } = build();
    const a = await svc.create(ctx, { level: 'warning', type: 'route_deviation', message: 'r' });
    bus.events.length = 0;

    const r = await svc.resolve(ctx, a.id);
    expect(r.resolved).toBe(true);
    expect(bus.events[0].type).toBe('alert.resolved');
  });

  test('resolve de alerta de OTRA compañía rechaza', async () => {
    const { svc, repo } = build();
    await repo.create({
      id: 'ext', companyId: 'cmp_OTHER', level: 'info', type: 'other',
      message: 'x', resolved: false, createdAt: new Date().toISOString(),
    });
    await expect(svc.resolve(ctx, 'ext')).rejects.toThrow(/no encontrada/i);
  });
});
