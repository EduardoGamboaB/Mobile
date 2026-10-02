/**
 * Viajes para el listado y el detalle: misma forma (`TripView`) venga de
 * la API (`isLive`) o de `demoData`. Las funciones de carga reciben sus
 * dependencias para poder probarlas con fetch simulado.
 */
import { isLive } from '../api/config';
import { driversApi, tractorsApi, tripsApi } from '../api/modules';
import type { DriverDTO, EvidenceDTO, EvidenceType, LogbookEntryDTO, LogbookEvent, TractorDTO, TripDTO } from '../api/types';
import type { TripPaymentStatus, TripStatus } from '../contracts/tripStatus';
import {
  driverById,
  logbookForTrip,
  tripById,
  trips as demoTrips,
  unitById,
  type Trip,
} from '../demoData';

export interface TripDriverView {
  id: string;
  name: string;
  initials: string;
  phone: string | null;
  /** Solo demo (el backend aún no expone scoring por chofer aquí). */
  score: number | null;
  onTimePct: number | null;
  kmPerLiter: number | null;
}

export interface TripUnitView {
  id: string;
  number: string;
  description: string;
  plates: string;
  /** Salud de mantenimiento 0–100 (solo demo). */
  health: number | null;
}

export interface TripView {
  id: string;
  folio: string;
  client: string;
  cargo: string;
  origin: string;
  destination: string;
  status: TripStatus;
  tons: number | null;
  pricePerTon: number | null;
  freightAmount: number | null;
  driverCommission: number | null;
  estimatedTolls: number | null;
  estimatedDiesel: number | null;
  /** Carga programada. */
  loadDate: string | null;
  etaUnload: string | null;
  preClosedAt: string | null;
  closedAt: string | null;
  paymentStatus: TripPaymentStatus;
  /** % de inspección NOM-068 (solo demo). */
  inspectionPct: number | null;
  evidenceCount: number | null;
  driver: TripDriverView | null;
  unit: TripUnitView | null;
}

export interface TripLogView {
  id: string;
  eventType: LogbookEvent;
  occurredAt: string;
  locationText: string;
  expenseAmount: number | null;
  expenseConcept: string | null;
  expenseHasReceipt: boolean;
}

export interface TripEvidenceView {
  id: string;
  type: EvidenceType;
  takenAt: string | null;
  mimeType: string | null;
}

export interface TripDetailData {
  trip: TripView;
  logbook: TripLogView[];
  /** null = no se pudo cargar (la sección muestra el aviso). */
  evidences: TripEvidenceView[] | null;
  /** Secciones que fallaron sin tumbar el detalle. */
  warnings: string[];
}

export const EVIDENCE_TYPE_LABEL: Record<EvidenceType, string> = {
  bill_of_lading: 'Carta porte / remisión',
  scale_ticket: 'Ticket de báscula',
  loading_photo: 'Foto de carga',
  unloading_photo: 'Foto de descarga',
  diesel_ticket: 'Ticket de diesel',
  toll_ticket: 'Ticket de caseta',
  delivery_proof: 'Prueba de entrega',
  incident_photo: 'Foto de incidencia',
  other: 'Otro',
};

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

/** Enlace al detalle: con backend usa la ruta estática `?id=` (el export no conoce los ids reales). */
export function tripHref(id: string, live: boolean = isLive): string {
  return live ? `/trips/view/?id=${encodeURIComponent(id)}` : `/trips/${id}/`;
}

// ── Demo ────────────────────────────────────────────────────────────────

export function demoTripView(t: Trip): TripView {
  const d = driverById(t.driverId);
  const u = unitById(t.tractorId);
  return {
    id: t.id,
    folio: t.folio,
    client: t.client,
    cargo: t.cargo,
    origin: t.origin,
    destination: t.destination,
    status: t.status,
    tons: t.tons,
    pricePerTon: t.pricePerTon,
    freightAmount: t.freightAmount,
    driverCommission: t.driverCommission,
    estimatedTolls: t.estimatedTolls,
    estimatedDiesel: t.estimatedDiesel,
    loadDate: t.loadDate,
    etaUnload: t.etaUnload,
    preClosedAt: t.preClosedAt ?? null,
    closedAt: t.closedAt,
    paymentStatus: t.paymentStatus,
    inspectionPct: t.inspectionPct,
    evidenceCount: t.evidenceCount,
    driver: d
      ? { id: d.id, name: d.name, initials: d.initials, phone: d.phone, score: d.score, onTimePct: d.onTimePct, kmPerLiter: d.kmPerLiter }
      : null,
    unit: u
      ? { id: u.id, number: u.number, description: `${u.brand} ${u.model}`, plates: u.plates, health: u.health }
      : null,
  };
}

export function demoTripList(): TripView[] {
  return demoTrips.map(demoTripView);
}

export function demoTripDetail(id: string): TripDetailData | null {
  const t = tripById(id);
  if (!t) return null;
  return {
    trip: demoTripView(t),
    logbook: logbookForTrip(id).map((e) => ({ ...e })),
    evidences: null,
    warnings: [],
  };
}

// ── API ─────────────────────────────────────────────────────────────────

function driverView(d: DriverDTO | undefined | null): TripDriverView | null {
  if (!d) return null;
  return { id: d.id, name: d.fullName, initials: initialsOf(d.fullName), phone: d.phone, score: null, onTimePct: null, kmPerLiter: null };
}

function unitView(t: TractorDTO | undefined | null): TripUnitView | null {
  if (!t) return null;
  return {
    id: t.id,
    number: t.unitNumber,
    description: [t.brand, t.model, t.year].filter(Boolean).join(' ') || 'Tracto',
    plates: t.plates,
    health: null,
  };
}

export function apiTripView(t: TripDTO, driver?: DriverDTO | null, tractor?: TractorDTO | null, evidenceCount: number | null = null): TripView {
  return {
    id: t.id,
    folio: t.folio,
    client: t.clientName ?? 'Sin cliente',
    cargo: t.cargo ?? 'Carga sin describir',
    origin: t.origin,
    destination: t.destination,
    status: t.status,
    tons: t.tons,
    pricePerTon: t.pricePerTon,
    freightAmount: t.freightAmount,
    driverCommission: t.driverCommission,
    estimatedTolls: t.estimatedTolls,
    estimatedDiesel: t.estimatedDiesel,
    loadDate: t.scheduledAt ?? t.startedAt,
    etaUnload: t.estimatedUnloadAt,
    preClosedAt: t.preClosedAt,
    closedAt: t.closedAt,
    paymentStatus: t.paymentStatus,
    inspectionPct: null,
    evidenceCount,
    driver: driverView(driver),
    unit: unitView(tractor),
  };
}

function logView(e: LogbookEntryDTO): TripLogView {
  return {
    id: e.id,
    eventType: e.eventType,
    occurredAt: e.occurredAt,
    locationText: e.locationText ?? 'Sin ubicación',
    expenseAmount: e.expenseAmount,
    expenseConcept: e.expenseConcept,
    expenseHasReceipt: e.expenseHasReceipt,
  };
}

function evidenceView(e: EvidenceDTO): TripEvidenceView {
  return { id: e.id, type: e.type, takenAt: e.takenAt ?? e.createdAt, mimeType: e.mimeType };
}

export interface TripsApiDeps {
  trips: Pick<typeof tripsApi, 'list' | 'get' | 'logbook' | 'evidences'>;
  drivers: Pick<typeof driversApi, 'list' | 'get'>;
  tractors: Pick<typeof tractorsApi, 'list' | 'get'>;
}

const defaultDeps: TripsApiDeps = { trips: tripsApi, drivers: driversApi, tractors: tractorsApi };

/** Listado: viajes + choferes y tractos para mostrar nombres (si fallan, el listado sigue). */
export async function loadTripList(deps: TripsApiDeps = defaultDeps): Promise<TripView[]> {
  const [list, drivers, tractors] = await Promise.all([
    deps.trips.list(),
    deps.drivers.list().catch(() => [] as DriverDTO[]),
    deps.tractors.list().catch(() => [] as TractorDTO[]),
  ]);
  return list.map((t) =>
    apiTripView(
      t,
      drivers.find((d) => d.id === t.driverId),
      tractors.find((u) => u.id === t.tractorId),
    ),
  );
}

/** Detalle: el viaje es obligatorio (404 → null); bitácora, evidencias, chofer y tracto son opcionales. */
export async function loadTripDetail(id: string, deps: TripsApiDeps = defaultDeps): Promise<TripDetailData | null> {
  let trip: TripDTO;
  try {
    trip = await deps.trips.get(id);
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
  const [log, ev, drv, trc] = await Promise.allSettled([
    deps.trips.logbook(id),
    deps.trips.evidences(id),
    trip.driverId ? deps.drivers.get(trip.driverId) : Promise.resolve(null),
    trip.tractorId ? deps.tractors.get(trip.tractorId) : Promise.resolve(null),
  ]);
  const warnings: string[] = [];
  if (log.status === 'rejected') warnings.push('No se pudo cargar la bitácora.');
  if (ev.status === 'rejected') warnings.push('No se pudieron cargar las evidencias.');
  const evidences = ev.status === 'fulfilled' ? ev.value.map(evidenceView) : null;
  const logbook = log.status === 'fulfilled'
    ? [...log.value].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)).map(logView)
    : [];
  return {
    trip: apiTripView(
      trip,
      drv.status === 'fulfilled' ? drv.value : null,
      trc.status === 'fulfilled' ? trc.value : null,
      evidences ? evidences.length : null,
    ),
    logbook,
    evidences,
    warnings,
  };
}

/** Lo que usan las pantallas: API con backend, demoData sin él. */
export function getTripList(): Promise<TripView[]> {
  return isLive ? loadTripList() : Promise.resolve(demoTripList());
}

export function getTripDetail(id: string): Promise<TripDetailData | null> {
  return isLive ? loadTripDetail(id) : Promise.resolve(demoTripDetail(id));
}

