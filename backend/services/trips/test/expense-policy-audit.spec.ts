import { TripsService, type RequestCtx } from '../src/trips.service';
import { InMemoryTripRepo } from '../src/in-memory.trip.repo';
import {
  InMemoryEvidenceRepo,
  InMemoryExpensePolicyRepo,
  InMemoryLogbookRepo,
  StubEvidenceStorage,
} from '../src/in-memory.ops.repo';
import { RecordingEventBus } from '../src/event.bus';
import { HttpAuditSink, RecordingAuditSink, auditSinkFromEnv, NoopAuditSink } from '../src/audit.sink';

const owner: RequestCtx = {
  companyId: 'cmp_1',
  tier: 'starter',
  userId: 'usr_owner',
  role: 'owner',
  ip: '201.140.1.10',
  userAgent: 'Mozilla/5.0 Admin',
};

function build(audit = new RecordingAuditSink()) {
  const logs: string[] = [];
  const svc = new TripsService(
    new InMemoryTripRepo(),
    new RecordingEventBus(),
    {
      logbook: new InMemoryLogbookRepo(),
      evidences: new InMemoryEvidenceRepo(),
      policies: new InMemoryExpensePolicyRepo(),
      storage: new StubEvidenceStorage(),
    },
    { audit, log: (m) => logs.push(m) },
  );
  return { svc, audit, logs };
}

describe('política de gastos → bitácora de auditoría', () => {
  test('putExpensePolicy registra expense_policy.updated con actor, recurso, ip y antes/después', async () => {
    const { svc, audit } = build();
    await svc.putExpensePolicy(owner, { allowManualExpense: true, manualMaxAmount: 300, requireReceipt: false });
    await svc.putExpensePolicy(owner, { allowManualExpense: false, manualMaxAmount: 300, requireReceipt: true });

    expect(audit.events).toHaveLength(2);
    expect(audit.events[1]).toEqual({
      companyId: 'cmp_1',
      actor: { type: 'user', userId: 'usr_owner', role: 'owner' },
      action: 'expense_policy.updated',
      resource: { type: 'expense_policy', id: 'cmp_1' },
      ip: '201.140.1.10',
      userAgent: 'Mozilla/5.0 Admin',
      metadata: {
        before: { allowManualExpense: true, manualMaxAmount: 300, requireReceipt: false },
        after: { allowManualExpense: false, manualMaxAmount: 300, requireReceipt: true },
        changed: ['allowManualExpense', 'requireReceipt'],
      },
    });
    // La primera vez el "antes" es la regla por defecto (nunca configurada).
    expect(audit.events[0].metadata).toMatchObject({
      before: { allowManualExpense: true, manualMaxAmount: null, requireReceipt: false },
      changed: ['manualMaxAmount'],
    });
  });

  test('si la auditoría falla la política se guarda igual y el error solo se loguea', async () => {
    const audit = new RecordingAuditSink();
    audit.failWith = new Error('auth caído');
    const { svc, logs } = build(audit);
    const saved = await svc.putExpensePolicy(owner, { allowManualExpense: false, manualMaxAmount: null, requireReceipt: true });
    expect(saved.requireReceipt).toBe(true);
    expect((await svc.getExpensePolicy(owner)).requireReceipt).toBe(true);
    expect(logs.join('\n')).toContain('auth caído');
  });

  test('una validación fallida no audita nada; un chofer no puede cambiarla', async () => {
    const { svc, audit } = build();
    await expect(
      svc.putExpensePolicy(owner, { allowManualExpense: true, manualMaxAmount: -1, requireReceipt: false }),
    ).rejects.toThrow();
    await expect(
      svc.putExpensePolicy({ ...owner, role: 'driver', driverId: 'drv_1' }, {
        allowManualExpense: true, manualMaxAmount: null, requireReceipt: false,
      }),
    ).rejects.toThrow();
    expect(audit.events).toHaveLength(0);
  });
});

describe('HttpAuditSink', () => {
  const event = {
    companyId: 'cmp_1',
    actor: { type: 'user' as const, userId: 'u1', role: 'owner' as const },
    action: 'expense_policy.updated' as const,
    resource: { type: 'expense_policy', id: 'cmp_1' },
    ip: null,
    userAgent: null,
    metadata: { a: 1 },
  };

  test('POST {AUTH_URL}/api/audit/events con x-internal-token y el cuerpo de la ingesta', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response('{}', { status: 201 });
    }) as unknown as typeof fetch;
    const sink = new HttpAuditSink({ authUrl: 'http://auth:8081/', internalToken: 't'.repeat(32), fetch: fakeFetch });
    await sink.record(event);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('http://auth:8081/api/audit/events');
    expect(calls[0].init.method).toBe('POST');
    expect((calls[0].init.headers as Record<string, string>)['x-internal-token']).toBe('t'.repeat(32));
    expect(JSON.parse(String(calls[0].init.body))).toEqual(event);
  });

  test('respuesta no 2xx o timeout → rechaza (el servicio decide qué hacer)', async () => {
    const bad = (async () => new Response('no', { status: 401 })) as unknown as typeof fetch;
    await expect(new HttpAuditSink({ authUrl: 'http://a', internalToken: 'x', fetch: bad }).record(event)).rejects.toThrow(
      /401/,
    );
    const hang = ((_u: string, init: RequestInit) =>
      new Promise((_r, reject) => init.signal?.addEventListener('abort', () => reject(new Error('aborted'))))) as unknown as typeof fetch;
    await expect(
      new HttpAuditSink({ authUrl: 'http://a', internalToken: 'x', fetch: hang, timeoutMs: 20 }).record(event),
    ).rejects.toThrow();
  });

  test('auditSinkFromEnv: HTTP con AUTH_URL + token; sin token, Noop', () => {
    expect(auditSinkFromEnv({ AUTH_URL: 'http://auth', INTERNAL_TOKEN: 'x'.repeat(32) })).toBeInstanceOf(HttpAuditSink);
    expect(auditSinkFromEnv({ AUTH_URL: 'http://auth', AUDIT_INGEST_TOKEN: 'y'.repeat(32) })).toBeInstanceOf(HttpAuditSink);
    expect(auditSinkFromEnv({ AUTH_URL: 'http://auth' })).toBeInstanceOf(NoopAuditSink);
  });
});
