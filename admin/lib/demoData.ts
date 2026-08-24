/**
 * Datos demo del panel admin. Multi-tenant: la compañía actual es G3 Logistics.
 *
 * Entidades modeladas (espejo del backend GCP futuro):
 *   drivers · trips · tractors · trailers · documents · alerts · incidents
 */

/**
 * `pre_closed` = precierre: el chofer entregó con el cliente final pero la
 * unidad viaja en vacío de regreso a matriz. El viaje se considera completo
 * hasta `finished` (cierre en matriz).
 */
export type TripStatus =
  | 'scheduled' | 'loading' | 'in_transit' | 'unloading' | 'pre_closed' | 'finished' | 'cancelled';

export interface Driver {
  id: string;
  name: string;
  initials: string;
  phone: string;
  email: string;
  license: string;
  licenseExpiresAt: string;
  unitNumber: string | null;
  status: 'active' | 'on_trip' | 'inactive' | 'suspended';
  score: number;
  onTimePct: number;
  kmPerLiter: number;
  incidents12m: number;
  tripsLast30: number;
  earningsMonthMXN: number;
}

export interface Tractor {
  id: string;
  number: string;
  brand: string;
  model: string;
  year: number;
  plates: string;
  vin: string;
  fuel: 'diesel' | 'electrico' | 'hibrido';
  horsepower: number;
  status: 'active' | 'maintenance' | 'parked' | 'sold';
  driverId: string | null;
  health: number;
  mileageKm: number;
  lastServiceKm: number;
  nextServiceKm: number;
  insuranceExpiresAt: string;
  verificationExpiresAt: string;
}

export type TrailerType =
  | 'jaula_42' | 'caja_53' | 'caja_48' | 'refrigerado' | 'tolva' | 'tanque' | 'plataforma' | 'lowboy';

export interface Trailer {
  id: string;
  number: string;
  type: TrailerType;
  plates: string;
  vin: string;
  capacityTons: number;
  tempRange?: string;
  status: 'active' | 'maintenance' | 'parked';
  attachedTractorId: string | null;
  health: number;
  lastInspectionAt: string;
  insuranceExpiresAt: string;
}

export interface Trip {
  id: string;
  folio: string;
  client: string;
  cargo: string;
  origin: string;
  destination: string;
  driverId: string;
  tractorId: string;
  trailerId: string | null;
  status: TripStatus;
  loadDate: string;
  etaUnload: string;
  /** Precierre: entrega con el cliente final (retorno en vacío a matriz). */
  preClosedAt?: string | null;
  finishedAt: string | null;
  tons: number;
  pricePerTon: number;
  grossAmount: number;
  driverCommission: number;
  tolls: number;
  diesel: number;
  inspectionPct: number;
  evidenceCount: number;
  paymentStatus: 'pending' | 'released' | 'held' | 'na';
}

export interface FleetKpi {
  unitsActive: number;
  unitsTotal: number;
  driversOnRoute: number;
  driversTotal: number;
  tripsThisMonth: number;
  revenueMonthMXN: number;
  onTimePct: number;
  pendingPayouts: number;
  openIncidents: number;
}

export interface Incident {
  id: string;
  tripFolio: string;
  type: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  driverId: string;
  reportedAt: string;
  resolved: boolean;
}

export type AlertSource = 'tractor' | 'trailer' | 'driver' | 'trip' | 'document';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export interface Alert {
  id: string;
  source: AlertSource;
  entityId: string;
  entityLabel: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  createdAt: string;
  acknowledged: boolean;
}

export type DocumentKind =
  | 'license' | 'medical' | 'training'
  | 'circulation_card' | 'insurance' | 'vehicle_verification'
  | 'trailer_inspection';

export interface DocumentItem {
  id: string;
  ownerKind: 'driver' | 'tractor' | 'trailer';
  ownerId: string;
  kind: DocumentKind;
  label: string;
  expiresAt: string;
  status: 'ok' | 'expiring' | 'expired';
}

const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
const hours = (n: number) => new Date(Date.now() + n * 3_600_000).toISOString();

/* =============================================================
 * DRIVERS
 * ============================================================= */
export const drivers: Driver[] = [
  { id: 'd1', name: 'Juan Pérez Hernández', initials: 'JP', phone: '+525512345678', email: 'juan.perez@g3logistics.mx',    license: 'B-7894561', licenseExpiresAt: days(20).slice(0,10),  unitNumber: 'U-104', status: 'on_trip',  score: 92, onTimePct: 97, kmPerLiter: 3.2, incidents12m: 1, tripsLast30: 12, earningsMonthMXN: 24_380 },
  { id: 'd2', name: 'Miguel Ángel Soto',     initials: 'MS', phone: '+525512388812', email: 'miguel.soto@g3logistics.mx',   license: 'B-4421008', licenseExpiresAt: days(180).slice(0,10), unitNumber: 'U-108', status: 'active',   score: 88, onTimePct: 94, kmPerLiter: 3.1, incidents12m: 0, tripsLast30: 11, earningsMonthMXN: 22_100 },
  { id: 'd3', name: 'Roberto Aguilar',       initials: 'RA', phone: '+525518800321', email: 'roberto.aguilar@g3logistics.mx', license: 'B-9938120', licenseExpiresAt: days(95).slice(0,10),  unitNumber: 'U-201', status: 'on_trip',  score: 85, onTimePct: 90, kmPerLiter: 2.9, incidents12m: 2, tripsLast30: 10, earningsMonthMXN: 19_800 },
  { id: 'd4', name: 'Eduardo Gamboa Jr.',    initials: 'EG', phone: '+525514441222', email: 'eduardo.gamboa@g3logistics.mx', license: 'B-1187220', licenseExpiresAt: days(40).slice(0,10),  unitNumber: 'U-202', status: 'active',   score: 96, onTimePct: 99, kmPerLiter: 3.4, incidents12m: 0, tripsLast30: 13, earningsMonthMXN: 27_900 },
  { id: 'd5', name: 'Salvador Méndez',       initials: 'SM', phone: '+525593881122', email: 'salvador.mendez@g3logistics.mx', license: 'B-6611009', licenseExpiresAt: days(8).slice(0,10),   unitNumber: 'U-303', status: 'active',   score: 74, onTimePct: 82, kmPerLiter: 2.6, incidents12m: 3, tripsLast30: 8,  earningsMonthMXN: 15_200 },
  { id: 'd6', name: 'Carlos Iván Ríos',      initials: 'CR', phone: '+525555000123', email: 'carlos.rios@g3logistics.mx',    license: 'B-2204487', licenseExpiresAt: days(220).slice(0,10), unitNumber: null,    status: 'inactive', score: 68, onTimePct: 78, kmPerLiter: 2.7, incidents12m: 4, tripsLast30: 3,  earningsMonthMXN: 6_100 },
];

/* =============================================================
 * TRACTORS · 7 unidades motrices
 * ============================================================= */
export const tractors: Tractor[] = [
  { id: 't104', number: 'U-104', brand: 'Kenworth',     model: 'T680',     year: 2022, plates: 'XY-12-345', vin: '1XKWD49X1NJ142101', fuel: 'diesel', horsepower: 500, status: 'active',      driverId: 'd1', health: 92, mileageKm: 142_730, lastServiceKm: 140_000, nextServiceKm: 150_000, insuranceExpiresAt: days(180).slice(0,10), verificationExpiresAt: days(95).slice(0,10) },
  { id: 't108', number: 'U-108', brand: 'Freightliner', model: 'Cascadia', year: 2021, plates: 'XY-14-887', vin: '3AKJHHDR9LSKK0322', fuel: 'diesel', horsepower: 455, status: 'active',      driverId: 'd2', health: 87, mileageKm: 218_900, lastServiceKm: 215_000, nextServiceKm: 225_000, insuranceExpiresAt: days(40).slice(0,10),  verificationExpiresAt: days(160).slice(0,10) },
  { id: 't201', number: 'U-201', brand: 'International',model: 'LT',       year: 2023, plates: 'XY-22-118', vin: '3HSDJSJR8PN550118', fuel: 'diesel', horsepower: 475, status: 'active',      driverId: 'd3', health: 81, mileageKm: 89_400,  lastServiceKm: 85_000,  nextServiceKm: 95_000,  insuranceExpiresAt: days(70).slice(0,10),  verificationExpiresAt: days(20).slice(0,10)  },
  { id: 't202', number: 'U-202', brand: 'Kenworth',     model: 'T680',     year: 2023, plates: 'XY-22-200', vin: '1XKWD49X4PJ150240', fuel: 'diesel', horsepower: 500, status: 'active',      driverId: 'd4', health: 95, mileageKm: 67_200,  lastServiceKm: 65_000,  nextServiceKm: 75_000,  insuranceExpiresAt: days(220).slice(0,10), verificationExpiresAt: days(140).slice(0,10) },
  { id: 't303', number: 'U-303', brand: 'Volvo',        model: 'VNL',      year: 2019, plates: 'XY-30-300', vin: 'YV2RNAFEXSE003003', fuel: 'diesel', horsepower: 425, status: 'active',      driverId: 'd5', health: 70, mileageKm: 305_400, lastServiceKm: 300_000, nextServiceKm: 310_000, insuranceExpiresAt: days(15).slice(0,10),  verificationExpiresAt: days(60).slice(0,10)  },
  { id: 't401', number: 'U-401', brand: 'Freightliner', model: 'Cascadia', year: 2020, plates: 'XY-40-101', vin: '3AKJHHDR5LSAB9012', fuel: 'diesel', horsepower: 455, status: 'maintenance', driverId: null, health: 55, mileageKm: 412_100, lastServiceKm: 410_000, nextServiceKm: 420_000, insuranceExpiresAt: days(180).slice(0,10), verificationExpiresAt: days(-2).slice(0,10)  },
  { id: 't501', number: 'U-501', brand: 'Kenworth',     model: 'T880',     year: 2024, plates: 'XY-50-555', vin: '1XKZW49X8RJ280005', fuel: 'diesel', horsepower: 565, status: 'parked',      driverId: null, health: 98, mileageKm: 8_300,   lastServiceKm: 0,       nextServiceKm: 10_000,  insuranceExpiresAt: days(330).slice(0,10), verificationExpiresAt: days(330).slice(0,10) },
];

/* =============================================================
 * TRAILERS · 9 remolques de distintos tipos
 * ============================================================= */
export const TrailerTypeLabel: Record<TrailerType, string> = {
  jaula_42:    'Jaula 42"',
  caja_53:     'Caja seca 53"',
  caja_48:     'Caja seca 48"',
  refrigerado: 'Caja refrigerada 53"',
  tolva:       'Tolva granelera',
  tanque:      'Pipa / tanque',
  plataforma:  'Plataforma',
  lowboy:      'Lowboy / cama baja',
};

export const trailers: Trailer[] = [
  { id: 'r1', number: 'R-J42-01', type: 'jaula_42',    plates: 'AB-98-765', vin: '1J9JS3328L1000001', capacityTons: 28, status: 'active', attachedTractorId: 't104', health: 90, lastInspectionAt: days(-5).slice(0,10),  insuranceExpiresAt: days(150).slice(0,10) },
  { id: 'r2', number: 'R-J42-02', type: 'jaula_42',    plates: 'AB-12-111', vin: '1J9JS3328L1000002', capacityTons: 28, status: 'active', attachedTractorId: 't108', health: 88, lastInspectionAt: days(-12).slice(0,10), insuranceExpiresAt: days(110).slice(0,10) },
  { id: 'r3', number: 'R-C53-01', type: 'caja_53',     plates: 'AB-30-222', vin: '3H3V532C3LT222333', capacityTons: 24, status: 'active', attachedTractorId: 't202', health: 95, lastInspectionAt: days(-2).slice(0,10),  insuranceExpiresAt: days(200).slice(0,10) },
  { id: 'r4', number: 'R-RF-01',  type: 'refrigerado', plates: 'AB-40-444', vin: 'WSP533V0XL3001234', capacityTons: 22, tempRange: '−18°C a +20°C', status: 'active', attachedTractorId: null, health: 82, lastInspectionAt: days(-25).slice(0,10), insuranceExpiresAt: days(75).slice(0,10) },
  { id: 'r5', number: 'R-T20-01', type: 'tolva',       plates: 'AB-55-555', vin: '1T9LH4326KT555000', capacityTons: 30, status: 'active', attachedTractorId: 't201', health: 78, lastInspectionAt: days(-40).slice(0,10), insuranceExpiresAt: days(45).slice(0,10) },
  { id: 'r6', number: 'R-TQ-01',  type: 'tanque',      plates: 'AB-60-660', vin: 'TKQ4427883TG10101', capacityTons: 26, status: 'parked', attachedTractorId: null, health: 86, lastInspectionAt: days(-60).slice(0,10), insuranceExpiresAt: days(220).slice(0,10) },
  { id: 'r7', number: 'R-PL-01',  type: 'plataforma',  plates: 'AB-70-770', vin: 'PLT9988XPN1100099', capacityTons: 26, status: 'maintenance', attachedTractorId: null, health: 60, lastInspectionAt: days(-90).slice(0,10), insuranceExpiresAt: days(180).slice(0,10) },
  { id: 'r8', number: 'R-C48-01', type: 'caja_48',     plates: 'AB-80-880', vin: 'C48HWM8829100333', capacityTons: 20, status: 'parked', attachedTractorId: null, health: 92, lastInspectionAt: days(-18).slice(0,10), insuranceExpiresAt: days(190).slice(0,10) },
  { id: 'r9', number: 'R-LB-01',  type: 'lowboy',      plates: 'AB-90-990', vin: 'LBY1188277L9-1010', capacityTons: 45, status: 'parked', attachedTractorId: null, health: 70, lastInspectionAt: days(-100).slice(0,10), insuranceExpiresAt: days(30).slice(0,10) },
];

/* =============================================================
 * TRIPS · tractorId + trailerId
 * ============================================================= */
export const trips: Trip[] = [
  { id: 't1',  folio: 'G3-2026-00123', client: 'Cementos Mexicanos', cargo: 'Cemento CPC-30R',     origin: 'Tula, Hidalgo',    destination: 'Tampico, Tamaulipas', driverId: 'd1', tractorId: 't104', trailerId: 'r1', status: 'in_transit', loadDate: hours(-6),  etaUnload: hours(8),  finishedAt: null,        tons: 28, pricePerTon: 1450, grossAmount: 40600, driverCommission: 4200, tolls: 1850, diesel: 6400, inspectionPct: 100, evidenceCount: 6, paymentStatus: 'na' },
  { id: 't2',  folio: 'G3-2026-00124', client: 'Grupo Modelo',       cargo: 'Cerveza en pallets',  origin: 'Zacatecas',         destination: 'Monterrey',           driverId: 'd2', tractorId: 't108', trailerId: 'r2', status: 'scheduled',   loadDate: days(2),    etaUnload: days(3),   finishedAt: null,        tons: 24, pricePerTon: 1700, grossAmount: 40800, driverCommission: 4800, tolls: 1200, diesel: 4900, inspectionPct: 0,   evidenceCount: 0, paymentStatus: 'na' },
  { id: 't3',  folio: 'G3-2026-00125', client: 'Walmart',            cargo: 'Mercancía mixta',     origin: 'CDMX',              destination: 'Guadalajara',         driverId: 'd4', tractorId: 't202', trailerId: 'r3', status: 'scheduled',   loadDate: days(5),    etaUnload: days(6),   finishedAt: null,        tons: 22, pricePerTon: 1900, grossAmount: 41800, driverCommission: 5100, tolls: 1400, diesel: 5300, inspectionPct: 0,   evidenceCount: 0, paymentStatus: 'na' },
  { id: 't4',  folio: 'G3-2026-00126', client: 'Soriana',            cargo: 'Productos secos',     origin: 'Saltillo',          destination: 'Tijuana',             driverId: 'd3', tractorId: 't201', trailerId: 'r5', status: 'loading',     loadDate: hours(-2),  etaUnload: days(2),   finishedAt: null,        tons: 26, pricePerTon: 1650, grossAmount: 42900, driverCommission: 4900, tolls: 2100, diesel: 7800, inspectionPct: 88,  evidenceCount: 2, paymentStatus: 'na' },
  { id: 't5',  folio: 'G3-2026-00120', client: 'Bimbo',              cargo: 'Producto terminado',  origin: 'CDMX',              destination: 'Querétaro',           driverId: 'd1', tractorId: 't104', trailerId: 'r1', status: 'finished',    loadDate: days(-5),   etaUnload: days(-4),  finishedAt: days(-4),    tons: 18, pricePerTon: 1900, grossAmount: 34200, driverCommission: 3400, tolls: 720,  diesel: 2800, inspectionPct: 100, evidenceCount: 7, paymentStatus: 'pending' },
  { id: 't6',  folio: 'G3-2026-00118', client: 'Coca-Cola FEMSA',    cargo: 'Refrescos',           origin: 'Toluca',            destination: 'Puebla',              driverId: 'd2', tractorId: 't108', trailerId: 'r2', status: 'finished',    loadDate: days(-10),  etaUnload: days(-9),  finishedAt: days(-9),    tons: 26, pricePerTon: 1650, grossAmount: 42900, driverCommission: 3900, tolls: 980,  diesel: 3600, inspectionPct: 100, evidenceCount: 8, paymentStatus: 'released' },
  { id: 't7',  folio: 'G3-2026-00115', client: 'Soriana',            cargo: 'Mercancía',           origin: 'Saltillo',          destination: 'Reynosa',             driverId: 'd4', tractorId: 't202', trailerId: 'r3', status: 'finished',    loadDate: days(-13),  etaUnload: days(-11), finishedAt: days(-11),   tons: 24, pricePerTon: 1700, grossAmount: 40800, driverCommission: 4100, tolls: 1140, diesel: 4200, inspectionPct: 100, evidenceCount: 6, paymentStatus: 'released' },
  { id: 't8',  folio: 'G3-2026-00112', client: 'Lala',               cargo: 'Lácteos refrigerados',origin: 'Gómez Palacio',     destination: 'CDMX',                driverId: 'd5', tractorId: 't303', trailerId: 'r4', status: 'finished',    loadDate: days(-15),  etaUnload: days(-13), finishedAt: days(-13),   tons: 22, pricePerTon: 1500, grossAmount: 33000, driverCommission: 2800, tolls: 1820, diesel: 5600, inspectionPct: 75,  evidenceCount: 4, paymentStatus: 'held' },
  { id: 't9',  folio: 'G3-2026-00108', client: 'Pemex',              cargo: 'Aditivos químicos',   origin: 'Salamanca',         destination: 'Veracruz',            driverId: 'd1', tractorId: 't104', trailerId: 'r6', status: 'finished',    loadDate: days(-20),  etaUnload: days(-18), finishedAt: days(-18),   tons: 28, pricePerTon: 1900, grossAmount: 53200, driverCommission: 5200, tolls: 1400, diesel: 5800, inspectionPct: 100, evidenceCount: 9, paymentStatus: 'released' },
  { id: 't10', folio: 'G3-2026-00104', client: 'Walmart',            cargo: 'Mercancía',           origin: 'CDMX',              destination: 'Guadalajara',         driverId: 'd4', tractorId: 't202', trailerId: 'r3', status: 'finished',    loadDate: days(-25),  etaUnload: days(-23), finishedAt: days(-23),   tons: 22, pricePerTon: 1800, grossAmount: 39600, driverCommission: 3800, tolls: 1200, diesel: 5100, inspectionPct: 100, evidenceCount: 8, paymentStatus: 'released' },
];

/* =============================================================
 * INCIDENTS / ALERTS / DOCS
 * ============================================================= */
export const incidents: Incident[] = [
  { id: 'i1', tripFolio: 'G3-2026-00126', type: 'Falla mecánica',    urgency: 'high',     description: 'Pérdida de presión en línea trasera, km 142.', driverId: 'd3', reportedAt: hours(-2),  resolved: false },
  { id: 'i2', tripFolio: 'G3-2026-00120', type: 'Retén',             urgency: 'low',      description: 'Retén Guardia Nacional, revisión rutinaria.',  driverId: 'd1', reportedAt: days(-5),   resolved: true },
  { id: 'i3', tripFolio: 'G3-2026-00112', type: 'Retraso en carga',  urgency: 'medium',   description: 'Cliente con báscula descalibrada.',             driverId: 'd5', reportedAt: days(-15),  resolved: true },
];

function docStatus(iso: string): DocumentItem['status'] {
  const d = (new Date(iso).getTime() - Date.now()) / 86_400_000;
  if (d < 0) return 'expired';
  if (d <= 30) return 'expiring';
  return 'ok';
}

export const documents: DocumentItem[] = [
  ...drivers.map((d): DocumentItem => ({
    id: `doc-${d.id}-lic`, ownerKind: 'driver', ownerId: d.id, kind: 'license',
    label: 'Licencia federal', expiresAt: d.licenseExpiresAt, status: docStatus(d.licenseExpiresAt),
  })),
  ...tractors.flatMap((t): DocumentItem[] => [
    { id: `doc-${t.id}-ins`, ownerKind: 'tractor', ownerId: t.id, kind: 'insurance',            label: 'Póliza de seguro RC',  expiresAt: t.insuranceExpiresAt,    status: docStatus(t.insuranceExpiresAt) },
    { id: `doc-${t.id}-ver`, ownerKind: 'tractor', ownerId: t.id, kind: 'vehicle_verification', label: 'Verificación vehicular', expiresAt: t.verificationExpiresAt, status: docStatus(t.verificationExpiresAt) },
  ]),
  ...trailers.map((r): DocumentItem => ({
    id: `doc-${r.id}-ins`, ownerKind: 'trailer', ownerId: r.id, kind: 'insurance',
    label: 'Póliza de seguro', expiresAt: r.insuranceExpiresAt, status: docStatus(r.insuranceExpiresAt),
  })),
];

export const alerts: Alert[] = [
  { id: 'a1', source: 'trip',     entityId: 't4',   entityLabel: 'G3-2026-00126',          severity: 'critical', title: 'Falla mecánica reportada',         detail: 'Roberto Aguilar reportó pérdida de presión de aire en U-201, km 142 Saltillo-Reynosa.', createdAt: hours(-2), acknowledged: false },
  { id: 'a2', source: 'document', entityId: 'd5',   entityLabel: 'Salvador Méndez',         severity: 'critical', title: 'Licencia federal por vencer (8d)', detail: 'La licencia B-6611009 vence en 8 días. Bloquear asignaciones después del 25 may.',     createdAt: hours(-3), acknowledged: false },
  { id: 'a3', source: 'tractor',  entityId: 't303', entityLabel: 'U-303 Volvo VNL',         severity: 'warning',  title: 'Mantenimiento próximo',           detail: 'Faltan 4,600 km para el próximo servicio mayor (cada 10,000 km).',                       createdAt: hours(-5), acknowledged: false },
  { id: 'a4', source: 'trip',     entityId: 't1',   entityLabel: 'G3-2026-00123',          severity: 'warning',  title: 'Posible retraso en ETA',          detail: 'Tráfico en MEX-Pachuca. Retraso estimado: 40 min sobre ETA original 18:00.',             createdAt: hours(-1), acknowledged: false },
  { id: 'a5', source: 'document', entityId: 't201', entityLabel: 'U-201 International',     severity: 'warning',  title: 'Verificación pronto a vencer',    detail: 'La verificación de U-201 vence en 20 días. Agenda cita en CIVS.',                       createdAt: hours(-8), acknowledged: true  },
  { id: 'a6', source: 'driver',   entityId: 'd5',   entityLabel: 'Salvador Méndez',         severity: 'warning',  title: 'Score por debajo del umbral',     detail: 'Score 74 (umbral Pro = 80). Considera coaching o cambio de rutas asignadas.',           createdAt: days(-1),  acknowledged: false },
  { id: 'a7', source: 'tractor',  entityId: 't401', entityLabel: 'U-401 Freightliner',      severity: 'critical', title: 'Verificación vencida',           detail: 'La verificación vehicular venció hace 2 días. La unidad NO puede operar en federal.',   createdAt: days(-2),  acknowledged: false },
  { id: 'a8', source: 'trailer',  entityId: 'r9',   entityLabel: 'R-LB-01 Lowboy',          severity: 'warning',  title: 'Inspección remolque atrasada',   detail: 'Última inspección hace 100 días. Recomendado <= 60 días.',                              createdAt: days(-3),  acknowledged: false },
  { id: 'a9', source: 'trip',     entityId: 't5',   entityLabel: 'G3-2026-00120',          severity: 'info',     title: 'POD esperando validación',         detail: 'Bimbo entregó hace 4 días. Pendiente validar POD para liberar pago.',                  createdAt: days(-4),  acknowledged: false },
];

/* =============================================================
 * KPIs y helpers
 * ============================================================= */
export function kpis(): FleetKpi {
  const unitsActive = tractors.filter((u) => u.status === 'active').length;
  const driversOnRoute = drivers.filter((d) => d.status === 'on_trip').length;
  const monthRevenue = trips
    .filter((t) => t.paymentStatus === 'released')
    .reduce((s, t) => s + t.grossAmount, 0);
  const pendingPayouts = trips
    .filter((t) => t.paymentStatus === 'pending' || t.paymentStatus === 'held')
    .reduce((s, t) => s + t.driverCommission, 0);
  return {
    unitsActive,
    unitsTotal: tractors.length,
    driversOnRoute,
    driversTotal: drivers.length,
    tripsThisMonth: trips.filter((t) => t.status !== 'cancelled').length,
    revenueMonthMXN: monthRevenue,
    onTimePct: Math.round(drivers.reduce((s, d) => s + d.onTimePct, 0) / drivers.length),
    pendingPayouts,
    openIncidents: incidents.filter((i) => !i.resolved).length,
  };
}

export const driverById     = (id: string): Driver | undefined  => drivers.find((d) => d.id === id);
export const tractorById    = (id: string): Tractor | undefined => tractors.find((t) => t.id === id);
export const trailerById    = (id: string): Trailer | undefined => trailers.find((r) => r.id === id);
export const tripById       = (id: string): Trip | undefined    => trips.find((t) => t.id === id);
export const alertsByEntity = (kind: AlertSource, id: string): Alert[] =>
  alerts.filter((a) => a.source === kind && a.entityId === id);
export const documentsForOwner = (kind: DocumentItem['ownerKind'], id: string): DocumentItem[] =>
  documents.filter((d) => d.ownerKind === kind && d.ownerId === id);

/** Backwards-compat: el "unit" del trip es ahora el tractor. */
export const unitById = tractorById;
/** Compat alias para código previo. */
export const units = tractors;

export const company = {
  name: 'G3 Logistics',
  rfc: 'GLO250101AB1',
  city: 'Querétaro',
  members: 4,
  founder: 'Eduardo Gamboa',
};
