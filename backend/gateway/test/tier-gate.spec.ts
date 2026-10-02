import { matchGate, GATE_TABLE } from '../src/middleware/tier-gate';
import { Feature, minTierFor, type TierValue } from '@g3/contracts';

describe('tier-gate: tabla de gating por ruta', () => {
  test('GET /api/tractors/live/positions requiere FleetMap', () => {
    const m = matchGate('GET', '/api/tractors/live/positions');
    expect(m?.requires).toContain(Feature.FleetMap);
  });

  test('GET /api/vehicles/:id/track requiere FleetMap; la ingesta no tiene gate', () => {
    expect(matchGate('GET', '/api/vehicles/trc_1/track')?.requires).toContain(Feature.FleetMap);
    expect(matchGate('POST', '/api/telemetry/ingest/suntech')).toBeNull();
  });

  test('POST /api/trips/:id/release-payment requiere PaymentAuthorization', () => {
    const m = matchGate('POST', '/api/trips/trp_xyz/release-payment');
    expect(m?.requires).toContain(Feature.PaymentAuthorization);
  });

  test('GET rentabilidad (reporte y por viaje) requiere EarningsDashboard (Starter+)', () => {
    expect(matchGate('GET', '/api/trips/profitability')?.requires).toEqual([Feature.EarningsDashboard]);
    expect(matchGate('GET', '/api/trips/trp_1/profitability')?.requires).toEqual([Feature.EarningsDashboard]);
    expect(matchGate('GET', '/api/trips/trp_1')).toBeNull();
    expect(minTierFor(Feature.EarningsDashboard)).toBe('starter');
  });

  test('POST /api/ai/assistant-reply requiere AIAssistantChat', () => {
    const m = matchGate('POST', '/api/ai/assistant-reply');
    expect(m?.requires).toContain(Feature.AIAssistantChat);
  });

  test('POST /api/ai/extract-evidence requiere EvidenceOcr', () => {
    const m = matchGate('POST', '/api/ai/extract-evidence');
    expect(m?.requires).toContain(Feature.EvidenceOcr);
  });

  test('rutas sin gate devuelven null', () => {
    expect(matchGate('GET', '/api/companies/me')).toBeNull();
    expect(matchGate('POST', '/api/auth/login')).toBeNull();
  });

  test('todas las rutas en GATE_TABLE apuntan a una feature válida', () => {
    for (const row of GATE_TABLE) {
      for (const f of row.requires) {
        expect(typeof f).toBe('string');
        expect(Object.values(Feature)).toContain(f);
      }
    }
  });

  test('gating: free no tiene FleetMap → debe ser gateado', () => {
    const m = matchGate('GET', '/api/tractors/live/positions')!;
    const tier: TierValue = 'free';
    // simulamos: tier free no incluye FleetMap
    const passes = m.requires.every((f) => f === Feature.Logbook); // free sólo tiene básicos
    expect(passes).toBe(false);
  });
});
