/**
 * G3 Admin habla el vocabulario único de estados del viaje
 * (lib/contracts/tripStatus.ts, copia de @g3/contracts).
 */
import { isTripStatus, TRIP_STATUS_LABEL_ES } from '../../lib/contracts/tripStatus';
import { kpis, trips } from '../../lib/demoData';
import { IN_MOTION_TRIP_STATUSES, paymentChip, tripStatusLabel } from '../../lib/tripStatusUi';

describe('vocabulario único en Admin', () => {
  test('los viajes demo solo usan estados canónicos (nada de finished/assigned/paid)', () => {
    for (const t of trips) {
      expect(isTripStatus(t.status)).toBe(true);
      expect(['pending', 'released']).toContain(t.paymentStatus);
    }
    expect(trips.some((t) => t.status === 'closed')).toBe(true);
  });

  test('las etiquetas salen de TRIP_STATUS_LABEL_ES', () => {
    expect(tripStatusLabel('pre_closed')).toBe(TRIP_STATUS_LABEL_ES.pre_closed.toUpperCase());
    expect(tripStatusLabel('closed')).toBe('CERRADO');
  });

  test('"en ruta" = activos menos programados, incluye el retorno en precierre', () => {
    expect(IN_MOTION_TRIP_STATUSES).toEqual(['loading', 'in_transit', 'unloading', 'pre_closed']);
  });

  test('el pago es paymentStatus: por liberar solo desde precierre o cierre', () => {
    expect(paymentChip('in_transit', 'pending')).toBeNull();
    expect(paymentChip('pre_closed', 'pending')).toEqual({ label: 'POR LIBERAR', variant: 'amber' });
    expect(paymentChip('closed', 'released')).toEqual({ label: 'LIBERADO', variant: 'green' });
  });

  test('pendiente por pagar a choferes = entregados con pago pendiente', () => {
    const expected = trips
      .filter((t) => t.paymentStatus === 'pending' && (t.status === 'pre_closed' || t.status === 'closed'))
      .reduce((s, t) => s + t.driverCommission, 0);
    expect(kpis().pendingPayouts).toBe(expected);
    expect(expected).toBeGreaterThan(0);
  });
});
