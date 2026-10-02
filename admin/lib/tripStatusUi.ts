/**
 * Presentación de estados del viaje en G3 Admin. Las etiquetas y los grupos
 * salen del vocabulario único (`lib/contracts/tripStatus.ts`); aquí solo se
 * decide cómo se pintan.
 */
import {
  ACTIVE_TRIP_STATUSES,
  PAYABLE_TRIP_STATUSES,
  TRIP_STATUS_LABEL_ES,
  type TripPaymentStatus,
  type TripStatus,
} from './contracts/tripStatus';

/** Etiqueta de chip (MAYÚSCULAS, como el resto del panel). */
export const tripStatusLabel = (s: TripStatus): string => TRIP_STATUS_LABEL_ES[s].toUpperCase();

/** Activos ya en ruta (todo activo menos `scheduled`): incluye el retorno en precierre. */
export const IN_MOTION_TRIP_STATUSES: readonly TripStatus[] = ACTIVE_TRIP_STATUSES.filter(
  (s) => s !== 'scheduled',
);

export const isInMotion = (s: TripStatus) => IN_MOTION_TRIP_STATUSES.includes(s);

/**
 * Chip del pago al chofer. El pago no es un estado del viaje: se libera
 * desde el precierre o el cierre; antes de entregar no aplica.
 */
export function paymentChip(
  status: TripStatus,
  paymentStatus: TripPaymentStatus,
): { label: string; variant: 'green' | 'amber' } | null {
  if (paymentStatus === 'released') return { label: 'LIBERADO', variant: 'green' };
  if (PAYABLE_TRIP_STATUSES.includes(status)) return { label: 'POR LIBERAR', variant: 'amber' };
  return null;
}
