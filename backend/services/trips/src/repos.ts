import type { EvidenceDto, ExpensePolicyDto, LogbookEntryDto, TripDto, TripStatus } from '@g3/contracts';

/**
 * Contratos de persistencia de trips. Los implementan los repos en memoria
 * (dev/tests) y los `Pg*Repo` (producción) con la misma semántica; los tests
 * de contrato (`test/repos.contract.spec.ts`) corren contra ambos.
 */

export interface TripListFilter {
  status?: TripStatus;
  driverId?: string;
}

/** Filtros del reporte de rentabilidad, ya validados por el servicio. */
export interface TripReportFilter {
  /** `null` = todos menos `draft` y `cancelled`. */
  statuses: TripStatus[] | null;
  driverId?: string;
  tractorId?: string;
  /** Límites en ms (inclusive) sobre la fecha de referencia `scheduledAt ?? startedAt ?? createdAt`. */
  fromMs: number | null;
  toMs: number | null;
}

/** Campos que deja cada transición de estado. */
export type TripTransitionPatch = Partial<Pick<TripDto, 'startedAt' | 'preClosedAt' | 'closedAt' | 'cancelledAt'>> & {
  updatedAt: string;
};

export interface TripRepo {
  list(companyId: string, filter?: TripListFilter): Promise<TripDto[]>;
  findById(companyId: string, id: string): Promise<TripDto | null>;
  create(t: TripDto): Promise<TripDto>;
  update(companyId: string, id: string, patch: Partial<TripDto>): Promise<TripDto | null>;
  /**
   * Cambia el estado solo si sigue siendo `from` (compare-and-set). Devuelve
   * `null` si el viaje no existe o alguien más lo movió primero: dos avances
   * simultáneos → uno gana y el otro recibe error de transición.
   */
  transition(
    companyId: string,
    id: string,
    from: TripStatus,
    to: TripStatus,
    patch: TripTransitionPatch,
  ): Promise<TripDto | null>;
  /** Libera el pago si está `pending` y el viaje es pagable; `null` si no aplicó. */
  releasePayment(companyId: string, id: string, payableStatuses: readonly TripStatus[], at: string): Promise<TripDto | null>;
  /** Siguiente consecutivo de folio de la compañía en ese año (atómico, sin repetir bajo concurrencia). */
  nextFolioSeq(companyId: string, year: number): Promise<number>;
  /** Viajes del mes en curso (UTC) por `scheduledAt ?? startedAt ?? ahora` (límite del plan). */
  countInCurrentMonth(companyId: string): Promise<number>;
  countTotalForCompany(companyId: string): Promise<number>;
  /** Viajes en `statuses` cuyo tracto o remolque es el vehículo. */
  listByVehicle(companyId: string, vehicleId: string, statuses: readonly TripStatus[]): Promise<TripDto[]>;
  /** Viajes del reporte, ordenados por fecha de referencia desc (desempate por id). */
  listForReport(companyId: string, filter: TripReportFilter): Promise<TripDto[]>;
}

export interface LogbookRepo {
  findByClientUuid(companyId: string, clientUuid: string): Promise<LogbookEntryDto | null>;
  listByTrip(companyId: string, tripId: string): Promise<LogbookEntryDto[]>;
  /** Bitácora de varios viajes en una sola consulta (reporte de rentabilidad). */
  listByTrips(companyId: string, tripIds: string[]): Promise<LogbookEntryDto[]>;
  /**
   * Alta idempotente por `(companyId, clientUuid)`: si ya existía, devuelve
   * la fila guardada (con su `id` original) sin crear otra.
   */
  create(e: LogbookEntryDto): Promise<LogbookEntryDto>;
}

export interface EvidenceRepo {
  findByClientUuid(companyId: string, clientUuid: string): Promise<EvidenceDto | null>;
  listByTrip(companyId: string, tripId: string): Promise<EvidenceDto[]>;
  /** Idempotente por `(companyId, clientUuid)`, igual que la bitácora. */
  create(e: EvidenceDto): Promise<EvidenceDto>;
}

export interface ExpensePolicyRepo {
  get(companyId: string): Promise<ExpensePolicyDto | null>;
  put(p: ExpensePolicyDto): Promise<ExpensePolicyDto>;
}

/** Fecha de referencia del viaje para periodos (misma regla que `profitability.tripReferenceDate`). */
export function referenceMs(t: TripDto): number {
  return Date.parse(t.scheduledAt ?? t.startedAt ?? t.createdAt);
}

export function formatFolio(year: number, seq: number): string {
  return `G3-${year}-${String(seq).padStart(5, '0')}`;
}
