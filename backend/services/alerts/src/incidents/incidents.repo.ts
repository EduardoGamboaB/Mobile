import type {
  AlertRuleDto,
  IncidentCommentDto,
  IncidentDto,
  IncidentStatus,
  IncidentType,
  IncidentUrgency,
  OperationalSignalDto,
} from '@g3/contracts';
import type { Recipient } from './notifier';

/**
 * Contratos de persistencia del centro de incidentes. Cada interfaz tiene un
 * gemelo en memoria (`in-memory.incidents.repo.ts`, dev/tests) y uno en
 * Postgres (`pg.incidents.repo.ts`); ambos pasan la misma suite de contrato.
 */

/** Incidente aún sin folio: el repo lo asigna de forma atómica al insertar. */
export type NewIncident = Omit<IncidentDto, 'folio'>;

/** Folio a partir del año (UTC de `createdAt`) y el consecutivo de la compañía en ese año. */
export type FolioFormatter = (year: number, seq: number) => string;

/** Campos que se pueden cambiar después del alta. */
export type IncidentPatch = Partial<
  Pick<
    IncidentDto,
    | 'status'
    | 'assigneeId'
    | 'vehicleId'
    | 'acknowledgedAt'
    | 'resolvedAt'
    | 'closedAt'
    | 'escalationLevel'
    | 'updatedAt'
  >
>;

export interface IncidentListFilter {
  status?: IncidentStatus;
  urgency?: IncidentUrgency;
  assigneeId?: string;
  tripId?: string;
  driverId?: string;
  vehicleId?: string;
  type?: IncidentType;
  /** Solo los que no están resolved/closed. */
  openOnly?: boolean;
  /** Máximo de filas (los más recientes primero). Default 1000. */
  limit?: number;
}

export type EscalationStage = 'ack' | 'resolve';

export interface IncidentRepo {
  /**
   * Asigna el folio (contador por compañía y año, atómico) e inserta. Si ya
   * existe un incidente con el mismo `clientUuid` en la compañía devuelve ese
   * con `created: false` (idempotencia de la cola offline, también con altas
   * simultáneas).
   */
  create(i: NewIncident, folioOf: FolioFormatter): Promise<{ incident: IncidentDto; created: boolean }>;
  findById(companyId: string, id: string): Promise<IncidentDto | null>;
  findByClientUuid(companyId: string, clientUuid: string): Promise<IncidentDto | null>;
  /** Los más recientes primero. */
  list(companyId: string, filter?: IncidentListFilter): Promise<IncidentDto[]>;
  /**
   * Aplica el parche. Con `ifStatus`, solo si el estado actual sigue siendo
   * ese (control optimista entre dos operadores): si cambió devuelve `null`.
   */
  update(companyId: string, id: string, patch: IncidentPatch, opts?: { ifStatus?: IncidentStatus }): Promise<IncidentDto | null>;
  /** Liga una evidencia sin duplicarla (atómico). `null` si no existe. */
  addEvidence(companyId: string, id: string, evidenceId: string, updatedAt: string): Promise<IncidentDto | null>;
  /**
   * Incidentes abiertos de TODAS las compañías con algún SLA vencido que aún
   * no alcanzan el nivel de escalamiento correspondiente (barrido).
   */
  listEscalationDue(now: Date, limit?: number): Promise<IncidentDto[]>;
  /**
   * Reclama el escalamiento a `level` (compare-and-set): solo sube el nivel
   * si sigue abierto, el nivel actual es menor y el SLA de esa etapa sigue
   * vencido (para `ack`, además, sin acuse). Devuelve el incidente
   * actualizado al ganador y `null` a cualquier otro barrido concurrente:
   * así cada nivel notifica una sola vez aunque corran varias instancias.
   */
  claimEscalation(companyId: string, id: string, level: number, stage: EscalationStage, now: Date): Promise<IncidentDto | null>;
  addComment(companyId: string, c: IncidentCommentDto): Promise<IncidentCommentDto>;
  /** En orden de alta. */
  listComments(companyId: string, incidentId: string): Promise<IncidentCommentDto[]>;
}

export interface AlertRuleRepo {
  list(companyId: string): Promise<AlertRuleDto[]>;
  findById(companyId: string, id: string): Promise<AlertRuleDto | null>;
  /** Alta o reemplazo por id (dentro de la compañía). */
  save(r: AlertRuleDto): Promise<AlertRuleDto>;
  remove(companyId: string, id: string): Promise<boolean>;
}

/**
 * Contactos de notificación por compañía y usuario. En `upsert`, un campo
 * `undefined` conserva el valor guardado y `null` lo borra.
 */
export interface ContactDirectory {
  upsert(companyId: string, r: Recipient): Promise<Recipient>;
  findByRoles(companyId: string, roles: string[]): Promise<Recipient[]>;
  findByUser(companyId: string, userId: string): Promise<Recipient | null>;
}

export interface TrackedSignal {
  companyId: string;
  signal: OperationalSignalDto;
}

/**
 * Última posición por unidad con viaje activo (regla `device_offline`),
 * compartida entre réplicas.
 */
export interface VehicleSignalRepo {
  /**
   * Registra la posición si es más reciente que la guardada. Una señal sin
   * `tripId` (unidad sin viaje activo) deja de vigilar la unidad.
   */
  record(companyId: string, signal: OperationalSignalDto): Promise<void>;
  /** Unidades cuya última posición es anterior a `before` (más viejas primero). */
  listStale(before: Date, limit?: number): Promise<TrackedSignal[]>;
  /**
   * Toma la unidad para el barrido: la borra solo si su última posición
   * sigue siendo `recordedAt`. `true` solo para un barrido (el ganador);
   * `false` si otro la tomó o llegó una posición nueva.
   */
  claim(companyId: string, vehicleId: string, recordedAt: string): Promise<boolean>;
}
