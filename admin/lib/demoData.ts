/**
 * Datos demo del panel admin. Multi-tenant: la compañía actual es G3 Logistics.
 * Cubre 6 choferes, 8 unidades, 10 viajes (mix de estatus), incidencias y
 * KPIs operativos pensados para mostrar el valor del scoring (Fase 5).
 */

export type TripStatus =
  | 'scheduled' | 'loading' | 'in_transit' | 'unloading' | 'finished' | 'cancelled';

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
  score: number;            // 0..100 (compuesto)
  onTimePct: number;        // 0..100
  kmPerLiter: number;
  incidents12m: number;
  tripsLast30: number;
  earningsMonthMXN: number;
}

export interface Unit {
  id: string;
  number: string;
  type: string;
  plates: string;
  status: 'active' | 'maintenance' | 'parked';
  driverId: string | null;
  health: number; // 0..100 puntaje de mantenimiento
}

export interface Trip {
  id: string;
  folio: string;
  client: string;
  cargo: string;
  origin: string;
  destination: string;
  driverId: string;
  unitId: string;
  status: TripStatus;
  loadDate: string;
  etaUnload: string;
  finishedAt: string | null;
  tons: number;
  pricePerTon: number;
  grossAmount: number;
  driverCommission: number;
  tolls: number;
  diesel: number;
  /** % de completitud de la inspección NOM-068 al inicio. */
  inspectionPct: number;
  /** Cantidad de evidencias subidas. */
  evidenceCount: number;
  /** Estatus financiero. */
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

const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
const hours = (n: number) => new Date(Date.now() + n * 3_600_000).toISOString();

export const drivers: Driver[] = [
  { id: 'd1', name: 'Juan Pérez Hernández',    initials: 'JP', phone: '+525512345678', email: 'juan.perez@g3logistics.mx',   license: 'B-7894561', licenseExpiresAt: days(20).slice(0,10),  unitNumber: 'U-104', status: 'on_trip',  score: 92, onTimePct: 97, kmPerLiter: 3.2, incidents12m: 1, tripsLast30: 12, earningsMonthMXN: 24_380 },
  { id: 'd2', name: 'Miguel Ángel Soto',        initials: 'MS', phone: '+525512388812', email: 'miguel.soto@g3logistics.mx',  license: 'B-4421008', licenseExpiresAt: days(180).slice(0,10), unitNumber: 'U-108', status: 'active',   score: 88, onTimePct: 94, kmPerLiter: 3.1, incidents12m: 0, tripsLast30: 11, earningsMonthMXN: 22_100 },
  { id: 'd3', name: 'Roberto Aguilar',          initials: 'RA', phone: '+525518800321', email: 'roberto.aguilar@g3logistics.mx', license: 'B-9938120', licenseExpiresAt: days(95).slice(0,10),  unitNumber: 'U-201', status: 'on_trip',  score: 85, onTimePct: 90, kmPerLiter: 2.9, incidents12m: 2, tripsLast30: 10, earningsMonthMXN: 19_800 },
  { id: 'd4', name: 'Eduardo Gamboa Jr.',       initials: 'EG', phone: '+525514441222', email: 'eduardo.gamboa@g3logistics.mx', license: 'B-1187220', licenseExpiresAt: days(40).slice(0,10),  unitNumber: 'U-202', status: 'active',   score: 96, onTimePct: 99, kmPerLiter: 3.4, incidents12m: 0, tripsLast30: 13, earningsMonthMXN: 27_900 },
  { id: 'd5', name: 'Salvador Méndez',          initials: 'SM', phone: '+525593881122', email: 'salvador.mendez@g3logistics.mx', license: 'B-6611009', licenseExpiresAt: days(8).slice(0,10),   unitNumber: 'U-303', status: 'active',   score: 74, onTimePct: 82, kmPerLiter: 2.6, incidents12m: 3, tripsLast30: 8,  earningsMonthMXN: 15_200 },
  { id: 'd6', name: 'Carlos Iván Ríos',         initials: 'CR', phone: '+525555000123', email: 'carlos.rios@g3logistics.mx',     license: 'B-2204487', licenseExpiresAt: days(220).slice(0,10), unitNumber: null,    status: 'inactive', score: 68, onTimePct: 78, kmPerLiter: 2.7, incidents12m: 4, tripsLast30: 3,  earningsMonthMXN: 6_100 },
];

export const units: Unit[] = [
  { id: 'u104', number: 'U-104', type: 'Tráiler 53"', plates: 'XY-12-345', status: 'active',      driverId: 'd1', health: 92 },
  { id: 'u108', number: 'U-108', type: 'Tortón',      plates: 'XY-14-887', status: 'active',      driverId: 'd2', health: 87 },
  { id: 'u201', number: 'U-201', type: 'Tráiler 53"', plates: 'XY-22-118', status: 'active',      driverId: 'd3', health: 81 },
  { id: 'u202', number: 'U-202', type: 'Tráiler 53"', plates: 'XY-22-200', status: 'active',      driverId: 'd4', health: 95 },
  { id: 'u303', number: 'U-303', type: 'Caja seca',   plates: 'XY-30-300', status: 'active',      driverId: 'd5', health: 70 },
  { id: 'u401', number: 'U-401', type: 'Tortón',      plates: 'XY-40-101', status: 'maintenance', driverId: null, health: 55 },
  { id: 'u402', number: 'U-402', type: 'Tortón',      plates: 'XY-40-102', status: 'parked',      driverId: null, health: 84 },
  { id: 'u501', number: 'U-501', type: 'Tráiler 53"', plates: 'XY-50-555', status: 'parked',      driverId: null, health: 90 },
];

export const trips: Trip[] = [
  { id: 't1',  folio: 'G3-2026-00123', client: 'Cementos Mexicanos', cargo: 'Cemento CPC-30R',     origin: 'Tula, Hidalgo',    destination: 'Tampico, Tamaulipas', driverId: 'd1', unitId: 'u104', status: 'in_transit', loadDate: hours(-6),  etaUnload: hours(8),  finishedAt: null,        tons: 28, pricePerTon: 1450, grossAmount: 40600, driverCommission: 4200, tolls: 1850, diesel: 6400, inspectionPct: 100, evidenceCount: 6, paymentStatus: 'na' },
  { id: 't2',  folio: 'G3-2026-00124', client: 'Grupo Modelo',       cargo: 'Cerveza en pallets',  origin: 'Zacatecas',         destination: 'Monterrey',           driverId: 'd2', unitId: 'u108', status: 'scheduled',   loadDate: days(2),    etaUnload: days(3),   finishedAt: null,        tons: 24, pricePerTon: 1700, grossAmount: 40800, driverCommission: 4800, tolls: 1200, diesel: 4900, inspectionPct: 0,   evidenceCount: 0, paymentStatus: 'na' },
  { id: 't3',  folio: 'G3-2026-00125', client: 'Walmart',            cargo: 'Mercancía mixta',     origin: 'CDMX',              destination: 'Guadalajara',         driverId: 'd4', unitId: 'u202', status: 'scheduled',   loadDate: days(5),    etaUnload: days(6),   finishedAt: null,        tons: 22, pricePerTon: 1900, grossAmount: 41800, driverCommission: 5100, tolls: 1400, diesel: 5300, inspectionPct: 0,   evidenceCount: 0, paymentStatus: 'na' },
  { id: 't4',  folio: 'G3-2026-00126', client: 'Soriana',            cargo: 'Productos secos',     origin: 'Saltillo',          destination: 'Tijuana',             driverId: 'd3', unitId: 'u201', status: 'loading',     loadDate: hours(-2),  etaUnload: days(2),   finishedAt: null,        tons: 26, pricePerTon: 1650, grossAmount: 42900, driverCommission: 4900, tolls: 2100, diesel: 7800, inspectionPct: 88,  evidenceCount: 2, paymentStatus: 'na' },
  { id: 't5',  folio: 'G3-2026-00120', client: 'Bimbo',              cargo: 'Producto terminado',  origin: 'CDMX',              destination: 'Querétaro',           driverId: 'd1', unitId: 'u104', status: 'finished',    loadDate: days(-5),   etaUnload: days(-4),  finishedAt: days(-4),    tons: 18, pricePerTon: 1900, grossAmount: 34200, driverCommission: 3400, tolls: 720,  diesel: 2800, inspectionPct: 100, evidenceCount: 7, paymentStatus: 'pending' },
  { id: 't6',  folio: 'G3-2026-00118', client: 'Coca-Cola FEMSA',    cargo: 'Refrescos',           origin: 'Toluca',            destination: 'Puebla',              driverId: 'd2', unitId: 'u108', status: 'finished',    loadDate: days(-10),  etaUnload: days(-9),  finishedAt: days(-9),    tons: 26, pricePerTon: 1650, grossAmount: 42900, driverCommission: 3900, tolls: 980,  diesel: 3600, inspectionPct: 100, evidenceCount: 8, paymentStatus: 'released' },
  { id: 't7',  folio: 'G3-2026-00115', client: 'Soriana',            cargo: 'Mercancía',           origin: 'Saltillo',          destination: 'Reynosa',             driverId: 'd4', unitId: 'u202', status: 'finished',    loadDate: days(-13),  etaUnload: days(-11), finishedAt: days(-11),   tons: 24, pricePerTon: 1700, grossAmount: 40800, driverCommission: 4100, tolls: 1140, diesel: 4200, inspectionPct: 100, evidenceCount: 6, paymentStatus: 'released' },
  { id: 't8',  folio: 'G3-2026-00112', client: 'Lala',               cargo: 'Lácteos refrigerados',origin: 'Gómez Palacio',     destination: 'CDMX',                driverId: 'd5', unitId: 'u303', status: 'finished',    loadDate: days(-15),  etaUnload: days(-13), finishedAt: days(-13),   tons: 22, pricePerTon: 1500, grossAmount: 33000, driverCommission: 2800, tolls: 1820, diesel: 5600, inspectionPct: 75,  evidenceCount: 4, paymentStatus: 'held' },
  { id: 't9',  folio: 'G3-2026-00108', client: 'Pemex',              cargo: 'Aditivos químicos',   origin: 'Salamanca',         destination: 'Veracruz',            driverId: 'd1', unitId: 'u104', status: 'finished',    loadDate: days(-20),  etaUnload: days(-18), finishedAt: days(-18),   tons: 28, pricePerTon: 1900, grossAmount: 53200, driverCommission: 5200, tolls: 1400, diesel: 5800, inspectionPct: 100, evidenceCount: 9, paymentStatus: 'released' },
  { id: 't10', folio: 'G3-2026-00104', client: 'Walmart',            cargo: 'Mercancía',           origin: 'CDMX',              destination: 'Guadalajara',         driverId: 'd4', unitId: 'u202', status: 'finished',    loadDate: days(-25),  etaUnload: days(-23), finishedAt: days(-23),   tons: 22, pricePerTon: 1800, grossAmount: 39600, driverCommission: 3800, tolls: 1200, diesel: 5100, inspectionPct: 100, evidenceCount: 8, paymentStatus: 'released' },
];

export const incidents: Incident[] = [
  { id: 'i1', tripFolio: 'G3-2026-00126', type: 'Falla mecánica',    urgency: 'high',     description: 'Pérdida de presión en línea trasera, km 142.', driverId: 'd3', reportedAt: hours(-2),  resolved: false },
  { id: 'i2', tripFolio: 'G3-2026-00120', type: 'Retén',             urgency: 'low',      description: 'Retén Guardia Nacional, revisión rutinaria.',  driverId: 'd1', reportedAt: days(-5),   resolved: true },
  { id: 'i3', tripFolio: 'G3-2026-00112', type: 'Retraso en carga',  urgency: 'medium',   description: 'Cliente con báscula descalibrada.',             driverId: 'd5', reportedAt: days(-15),  resolved: true },
];

export function kpis(): FleetKpi {
  const unitsActive = units.filter((u) => u.status === 'active').length;
  const driversOnRoute = drivers.filter((d) => d.status === 'on_trip').length;
  const driversTotal = drivers.length;
  const month = new Date().getMonth();
  const monthTrips = trips.filter(
    (t) => t.finishedAt && new Date(t.finishedAt).getMonth() === month,
  );
  const revenueMonth = trips
    .filter((t) => t.paymentStatus === 'released')
    .reduce((s, t) => s + t.grossAmount, 0);
  const onTimePct = Math.round(
    drivers.reduce((s, d) => s + d.onTimePct, 0) / drivers.length,
  );
  const pendingPayouts = trips
    .filter((t) => t.paymentStatus === 'pending' || t.paymentStatus === 'held')
    .reduce((s, t) => s + t.driverCommission, 0);
  const openIncidents = incidents.filter((i) => !i.resolved).length;
  return {
    unitsActive,
    unitsTotal: units.length,
    driversOnRoute,
    driversTotal,
    tripsThisMonth: monthTrips.length + trips.filter((t) => t.status !== 'finished' && t.status !== 'cancelled').length,
    revenueMonthMXN: revenueMonth,
    onTimePct,
    pendingPayouts,
    openIncidents,
  };
}

export function driverById(id: string): Driver | undefined {
  return drivers.find((d) => d.id === id);
}
export function unitById(id: string): Unit | undefined {
  return units.find((u) => u.id === id);
}
export function tripById(id: string): Trip | undefined {
  return trips.find((t) => t.id === id);
}

export const company = {
  name: 'G3 Logistics',
  rfc: 'GLO250101AB1',
  city: 'Querétaro',
  members: 4,
  founder: 'Eduardo Gamboa',
};
