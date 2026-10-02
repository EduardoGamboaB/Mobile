import * as fs from 'fs';
import * as path from 'path';
import {
  ACTIVE_TRIP_STATUSES,
  TRIP_STATUSES,
  TRIP_TRANSITIONS,
  canTransition,
  fromLegacyTripStatus,
  nextTripStatus,
} from '../src';

describe('Vocabulario único de estados del viaje', () => {
  test('flujo feliz: scheduled → loading → in_transit → unloading → pre_closed → closed', () => {
    const path: string[] = [];
    let s: (typeof TRIP_STATUSES)[number] | null = 'scheduled';
    while (s) {
      path.push(s);
      s = nextTripStatus(s);
    }
    expect(path).toEqual(['scheduled', 'loading', 'in_transit', 'unloading', 'pre_closed', 'closed']);
  });

  test('closed y cancelled son terminales; el precierre sigue activo', () => {
    expect(TRIP_TRANSITIONS.closed).toEqual([]);
    expect(TRIP_TRANSITIONS.cancelled).toEqual([]);
    expect(ACTIVE_TRIP_STATUSES).toContain('pre_closed');
    expect(canTransition('pre_closed', 'cancelled')).toBe(false);
  });

  test('toda transición apunta a un estado del vocabulario', () => {
    for (const from of TRIP_STATUSES) {
      for (const to of TRIP_TRANSITIONS[from]) expect(TRIP_STATUSES).toContain(to);
    }
  });

  test('traduce los vocabularios heredados (Supabase V1 y backend previo)', () => {
    expect(fromLegacyTripStatus('finished')).toEqual({ status: 'closed', paymentReleased: false });
    expect(fromLegacyTripStatus('delivered').status).toBe('pre_closed');
    expect(fromLegacyTripStatus('assigned').status).toBe('scheduled');
    expect(fromLegacyTripStatus('arrived').status).toBe('unloading');
    expect(fromLegacyTripStatus('paid')).toEqual({ status: 'closed', paymentReleased: true });
    expect(fromLegacyTripStatus('canceled').status).toBe('cancelled');
    expect(() => fromLegacyTripStatus('volando')).toThrow(/desconocido/);
  });
});

describe('Copias del vocabulario en los frontends', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/trip-status.ts'), 'utf8');
  const copies = [
    path.join(__dirname, '../../../mobile/src/contracts/tripStatus.ts'),
    path.join(__dirname, '../../../admin/lib/contracts/tripStatus.ts'),
  ];
  test.each(copies)('%s es idéntica a contracts (corre backend/scripts/sync-contracts.sh)', (copy) => {
    expect(fs.readFileSync(copy, 'utf8')).toBe(source);
  });
});
