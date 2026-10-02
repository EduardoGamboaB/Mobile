import { StaticIntegrationResolver } from '@g3/integrations';
import { buildPacProvider } from '../src/pac/pac.factory';
import { MockPacProvider } from '../src/pac/mock.provider';
import { HighAvailabilityPacProvider } from '../src/pac/high-availability.provider';
import { DiverzaPacProvider, FacturamaPacProvider, PacConfigError } from '../src/pac/http-pac.providers';
import type { PacProvider, StampRequest, StampResult } from '../src/pac/pac.provider';

const pac = (provider: string, rfc = 'EKU9003173C9') => ({
  source: 'company' as const,
  provider,
  settings: { environment: 'sandbox', rfc, user: 'g3' },
  secrets: { password: 'pac-pass' },
});
const REQ: StampRequest = { xml: '<cfdi:Comprobante></cfdi:Comprobante>', invoiceId: 'inv_1', companyId: 'cmp_a' };

describe('buildPacProvider (ranuras primary/backup)', () => {
  test('primario + respaldo → multi-PAC con failover', async () => {
    const resolver = new StaticIntegrationResolver({
      'cmp_a|pac|primary': pac('diverza'),
      'cmp_a|pac|backup': pac('facturama'),
    });
    const p = await buildPacProvider('cmp_a', resolver);
    expect(p).toBeInstanceOf(HighAvailabilityPacProvider);
    expect(p.name).toBe('diverza+facturama');
    expect((p as HighAvailabilityPacProvider).primary).toBeInstanceOf(DiverzaPacProvider);
    expect((p as HighAvailabilityPacProvider).backup).toBeInstanceOf(FacturamaPacProvider);
    expect(resolver.calls.map((c) => c.slot).sort()).toEqual(['backup', 'primary']);
  });

  test('una sola ranura → ese PAC; ninguna → Mock', async () => {
    expect(await buildPacProvider('cmp_a', new StaticIntegrationResolver({ '*|pac|backup': pac('facturama') }))).toBeInstanceOf(FacturamaPacProvider);
    expect(await buildPacProvider('cmp_a', new StaticIntegrationResolver())).toBeInstanceOf(MockPacProvider);
  });

  test('los adaptadores validan la configuración', async () => {
    await expect(buildPacProvider('cmp_a', new StaticIntegrationResolver({ '*|pac|primary': pac('diverza', 'NO-RFC') }))).rejects.toBeInstanceOf(PacConfigError);
    expect(() => new DiverzaPacProvider({ environment: 'sandbox', rfc: 'EKU9003173C9', user: '', password: 'x' })).toThrow('user (Obligatorio)');
  });

  test('timbrado real pendiente: error claro, sin secretos', async () => {
    const d = new DiverzaPacProvider({ environment: 'sandbox', rfc: 'EKU9003173C9', user: 'g3', password: 'pac-pass' });
    const err = await d.stamp(REQ).catch((e: Error) => e);
    expect((err as Error).message).toBe('Diverza: adaptador HTTP pendiente de credenciales sandbox');
    expect((err as Error).message).not.toContain('pac-pass');
  });
});

describe('HighAvailabilityPacProvider', () => {
  const failing = (name: string): PacProvider => ({
    name,
    stamp: async () => { throw new Error('timeout'); },
    cancel: async () => ({ ok: false }),
    healthCheck: async () => false,
  });

  test('si el primario falla (excepción) timbra con el respaldo', async () => {
    const backup = new MockPacProvider();
    const r = await new HighAvailabilityPacProvider(failing('diverza'), backup).stamp(REQ);
    expect(r.ok).toBe(true);
    expect(backup.stamps).toHaveLength(1);
  });

  test('error del PAC (isOurError) → respaldo; rechazo del SAT → no reintenta', async () => {
    const ourError = new MockPacProvider({ failNext: true, errorCode: 'PAC500', isOurError: true });
    const backup = new MockPacProvider();
    expect((await new HighAvailabilityPacProvider(ourError, backup).stamp(REQ)).ok).toBe(true);

    const satReject = new MockPacProvider({ failNext: true, errorCode: 'CP201', isOurError: false });
    const backup2 = new MockPacProvider();
    const r = (await new HighAvailabilityPacProvider(satReject, backup2).stamp(REQ)) as Extract<StampResult, { ok: false }>;
    expect(r).toMatchObject({ ok: false, errorCode: 'CP201' });
    expect(backup2.stamps).toHaveLength(0);
  });

  test('ambos fallan → error con los dos motivos', async () => {
    await expect(new HighAvailabilityPacProvider(failing('diverza'), failing('facturama')).stamp(REQ)).rejects.toThrow(
      /diverza: timeout; facturama: timeout/,
    );
  });
});
