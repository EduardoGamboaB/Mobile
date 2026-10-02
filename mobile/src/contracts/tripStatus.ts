/**
 * Vocabulario ÚNICO de estados del viaje — fuente de verdad de G3.
 *
 * Este archivo no tiene dependencias a propósito: se copia tal cual a
 * `mobile/src/contracts/tripStatus.ts` y `admin/lib/contracts/tripStatus.ts`
 * con `backend/scripts/sync-contracts.sh`, y un test de contracts falla si
 * alguna copia se desfasa. No editar las copias: editar aquí y sincronizar.
 *
 * Ciclo del viaje:
 *
 *   draft → scheduled → loading → in_transit → unloading → pre_closed → closed
 *                 ╲          ╲            ╲            ╲
 *                  └──────────┴────────────┴────────────┴──→ cancelled
 *
 * - `pre_closed` (precierre): la carga se entregó con el cliente final; la
 *   unidad regresa en vacío a matriz. El viaje sigue ACTIVO.
 * - `closed` (cierre): la unidad llegó a matriz. Terminal.
 * - El pago al chofer NO es un estado del viaje: es `paymentStatus`
 *   ('pending' | 'released'), liberable desde `pre_closed` o `closed`.
 */

export const TRIP_STATUSES = [
  'draft',
  'scheduled',
  'loading',
  'in_transit',
  'unloading',
  'pre_closed',
  'closed',
  'cancelled',
] as const;

export type TripStatus = (typeof TRIP_STATUSES)[number];

export type TripPaymentStatus = 'pending' | 'released';

export const TRIP_TRANSITIONS: Readonly<Record<TripStatus, readonly TripStatus[]>> = {
  draft: ['scheduled', 'cancelled'],
  scheduled: ['loading', 'cancelled'],
  loading: ['in_transit', 'cancelled'],
  in_transit: ['unloading', 'cancelled'],
  unloading: ['pre_closed', 'closed'],
  pre_closed: ['closed'],
  closed: [],
  cancelled: [],
};

/** Estados en los que el viaje sigue vivo para el chofer y la torre. */
export const ACTIVE_TRIP_STATUSES: readonly TripStatus[] = [
  'scheduled',
  'loading',
  'in_transit',
  'unloading',
  'pre_closed',
];

/** Estados terminales (historial). */
export const FINAL_TRIP_STATUSES: readonly TripStatus[] = ['closed', 'cancelled'];

/** Estados desde los que se puede liberar el pago al chofer. */
export const PAYABLE_TRIP_STATUSES: readonly TripStatus[] = ['pre_closed', 'closed'];

export const TRIP_STATUS_LABEL_ES: Readonly<Record<TripStatus, string>> = {
  draft: 'Borrador',
  scheduled: 'Programado',
  loading: 'Cargando',
  in_transit: 'En tránsito',
  unloading: 'Descargando',
  pre_closed: 'Precerrado',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
};

export function isTripStatus(v: unknown): v is TripStatus {
  return typeof v === 'string' && (TRIP_STATUSES as readonly string[]).includes(v);
}

export function canTransition(from: TripStatus, to: TripStatus): boolean {
  return TRIP_TRANSITIONS[from].includes(to);
}

/** Siguiente paso "feliz" del flujo del chofer (sin cancelar ni saltarse el precierre). */
export function nextTripStatus(from: TripStatus): TripStatus | null {
  const next = TRIP_TRANSITIONS[from].find((s) => s !== 'cancelled');
  return next ?? null;
}

export function isActiveTrip(s: TripStatus): boolean {
  return ACTIVE_TRIP_STATUSES.includes(s);
}

/**
 * Traduce los vocabularios anteriores (Supabase V1 y backend pre-unificación)
 * al canónico. Se usa en migraciones de datos e integraciones heredadas.
 * `paid` se convierte en `closed` + paymentStatus 'released'.
 */
export function fromLegacyTripStatus(legacy: string): {
  status: TripStatus;
  paymentReleased: boolean;
} {
  const map: Record<string, TripStatus> = {
    // Supabase V1 (G3 Drive)
    scheduled: 'scheduled',
    loading: 'loading',
    in_transit: 'in_transit',
    unloading: 'unloading',
    pre_closed: 'pre_closed',
    finished: 'closed',
    cancelled: 'cancelled',
    // Backend NestJS pre-unificación
    draft: 'draft',
    assigned: 'scheduled',
    arrived: 'unloading',
    delivered: 'pre_closed',
    closed: 'closed',
    paid: 'closed',
    canceled: 'cancelled',
  };
  const status = map[legacy];
  if (!status) throw new Error(`Estado de viaje desconocido: ${legacy}`);
  return { status, paymentReleased: legacy === 'paid' };
}
