import type { Profile, Trip, LogbookEntry, Incident } from '@/models';

export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
export const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000099';

const now = Date.now();
const hours = (n: number) => new Date(now + n * 3600_000).toISOString();
const days = (n: number) => new Date(now + n * 86_400_000).toISOString();

export const demoProfile: Profile = {
  id: DEMO_USER_ID,
  company_id: DEMO_COMPANY_ID,
  role: 'driver',
  full_name: 'Juan Pérez Hernández',
  phone: '+525512345678',
  email: 'juan.perez@g3logistics.mx',
  federal_license: 'B-7894561',
  license_expires_at: days(20).slice(0, 10),
  assigned_unit_number: 'U-104',
  unit_type: 'Tráiler 53"',
  tractor_plates: 'XY-12-345',
  trailer_plates: 'AB-98-765',
  status: 'active',
  photo_url: null,
};

export const demoTrips: Trip[] = [
  {
    id: 'trip-active-1',
    company_id: DEMO_COMPANY_ID,
    driver_id: DEMO_USER_ID,
    folio: 'G3-2026-00123',
    client_name: 'Cementos Mexicanos',
    cargo: 'Cemento gris CPC-30R · sacos de 50 kg',
    origin: 'Planta Tula, Hidalgo',
    destination: 'Bodega Pemex, Tampico, Tamaulipas',
    load_date: hours(-6),
    estimated_unload_date: hours(8),
    tons: 28,
    price_per_ton: 1450,
    total_amount: 28 * 1450,
    driver_commission: 4200,
    estimated_tolls: 1850,
    estimated_diesel: 6400,
    status: 'in_transit',
    notes: null,
    started_at: hours(-5),
    closed_at: null,
    created_at: days(-2),
    updated_at: hours(-1),
  },
  {
    id: 'trip-scheduled-1',
    company_id: DEMO_COMPANY_ID,
    driver_id: DEMO_USER_ID,
    folio: 'G3-2026-00124',
    client_name: 'Grupo Modelo',
    cargo: 'Cerveza · pallets refrigerados',
    origin: 'Cervecería Zacatecas',
    destination: 'CEDIS Monterrey',
    load_date: days(2),
    estimated_unload_date: days(3),
    tons: 24,
    price_per_ton: 1700,
    total_amount: 24 * 1700,
    driver_commission: 4800,
    estimated_tolls: 1200,
    estimated_diesel: 4900,
    status: 'scheduled',
    notes: null,
    started_at: null,
    closed_at: null,
    created_at: days(-1),
    updated_at: days(-1),
  },
  {
    id: 'trip-history-1',
    company_id: DEMO_COMPANY_ID,
    driver_id: DEMO_USER_ID,
    folio: 'G3-2026-00120',
    client_name: 'Bimbo',
    cargo: 'Producto terminado',
    origin: 'Planta Azcapotzalco, CDMX',
    destination: 'CEDIS Querétaro',
    load_date: days(-5),
    estimated_unload_date: days(-4),
    tons: 18,
    price_per_ton: 1900,
    total_amount: 18 * 1900,
    driver_commission: 3400,
    estimated_tolls: 720,
    estimated_diesel: 2800,
    status: 'closed',
    notes: null,
    started_at: days(-5),
    closed_at: days(-4),
    created_at: days(-6),
    updated_at: days(-4),
  },
  {
    id: 'trip-history-2',
    company_id: DEMO_COMPANY_ID,
    driver_id: DEMO_USER_ID,
    folio: 'G3-2026-00118',
    client_name: 'Coca-Cola FEMSA',
    cargo: 'Refrescos en pallets',
    origin: 'Planta Toluca',
    destination: 'CEDIS Puebla',
    load_date: days(-10),
    estimated_unload_date: days(-9),
    tons: 26,
    price_per_ton: 1650,
    total_amount: 26 * 1650,
    driver_commission: 3900,
    estimated_tolls: 980,
    estimated_diesel: 3600,
    status: 'closed',
    notes: null,
    started_at: days(-10),
    closed_at: days(-9),
    created_at: days(-12),
    updated_at: days(-9),
  },
];

export const demoLogbook: LogbookEntry[] = [
  {
    id: 'log-1',
    client_uuid: 'log-1',
    trip_id: 'trip-active-1',
    driver_id: DEMO_USER_ID,
    event_type: 'departure',
    occurred_at: hours(-5),
    location_text: 'Planta Tula, Hidalgo',
    lat: 20.0533,
    lng: -99.3439,
    odometer_km: 142_385,
    fuel: 'full',
    expense_amount: null,
    expense_concept: null,
    comments: 'Salida con tanque lleno.',
    created_at: hours(-5),
  },
  {
    id: 'log-2',
    client_uuid: 'log-2',
    trip_id: 'trip-active-1',
    driver_id: DEMO_USER_ID,
    event_type: 'toll',
    occurred_at: hours(-3),
    location_text: 'Caseta Atlacomulco',
    lat: 19.7993,
    lng: -99.8775,
    odometer_km: 142_510,
    fuel: 'three_quarters',
    expense_amount: 285,
    expense_concept: 'caseta',
    comments: null,
    created_at: hours(-3),
  },
  {
    id: 'log-3',
    client_uuid: 'log-3',
    trip_id: 'trip-active-1',
    driver_id: DEMO_USER_ID,
    event_type: 'diesel',
    occurred_at: hours(-1),
    location_text: 'Pemex km 187',
    lat: 21.5,
    lng: -98.6,
    odometer_km: 142_730,
    fuel: 'full',
    expense_amount: 2_450,
    expense_concept: 'diesel · 180 L',
    comments: 'Carga completa.',
    created_at: hours(-1),
  },
];

export const demoIncidents: Incident[] = [
  {
    id: 'inc-1',
    client_uuid: 'inc-1',
    trip_id: 'trip-history-1',
    driver_id: DEMO_USER_ID,
    type: 'checkpoint',
    description: 'Retén Guardia Nacional km 142. Revisión rutinaria, sin novedad.',
    occurred_at: days(-5),
    location_text: 'Autopista México-Querétaro km 142',
    lat: 20.45,
    lng: -99.95,
    urgency: 'low',
    resolved: true,
    resolved_at: days(-5),
    created_at: days(-5),
  },
];

/* =====================================================================
 * Notifications
 * ===================================================================== */
export interface DemoNotification {
  id: string;
  kind: 'trip' | 'payment' | 'incident' | 'doc' | 'dispatch';
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}
export const demoNotifications: DemoNotification[] = [
  {
    id: 'n-1',
    kind: 'trip',
    title: 'Nuevo viaje asignado',
    body: 'G3-2026-00125 · Walmart · CDMX → Guadalajara. Carga el 22 may 14:00.',
    createdAt: hours(-0.2),
    read: false,
  },
  {
    id: 'n-2',
    kind: 'incident',
    title: 'Despacho respondió tu incidencia',
    body: 'Grúa confirmada, ETA 16:00. Espera en lugar seguro.',
    createdAt: hours(-1.5),
    read: false,
  },
  {
    id: 'n-3',
    kind: 'doc',
    title: 'Licencia próxima a vencer',
    body: 'Tu licencia federal vence en 20 días. Tramita la renovación.',
    createdAt: days(-2),
    read: true,
  },
  {
    id: 'n-4',
    kind: 'payment',
    title: 'Pago de viaje liberado',
    body: 'G3-2026-00118 · $3,900.00 depositados a tu cuenta.',
    createdAt: days(-4),
    read: true,
  },
];

/* =====================================================================
 * Chats con despacho
 * ===================================================================== */
export interface DemoChatPreview {
  id: string;
  name: string;
  role: string;
  initials: string;
  avatarGradient: [string, string];
  lastMessage: string;
  lastAt: string;
  unread: number;
}
export const demoChats: DemoChatPreview[] = [
  {
    id: 'chat-dispatch',
    name: 'María L. · Despacho',
    role: 'dispatcher',
    initials: 'ML',
    avatarGradient: ['#0E2A47', '#2E86C1'],
    lastMessage: 'Grúa confirmada, ETA 16:00. Espera en lugar seguro.',
    lastAt: hours(-1.5),
    unread: 2,
  },
  {
    id: 'chat-mech',
    name: 'Soporte mecánico',
    role: 'mechanic',
    initials: 'SM',
    avatarGradient: ['#475569', '#1F2937'],
    lastMessage: 'Documenta el código de falla y mándalo por foto.',
    lastAt: days(-1),
    unread: 0,
  },
  {
    id: 'chat-admin',
    name: 'Roberto A. · Admin',
    role: 'admin',
    initials: 'RA',
    avatarGradient: ['#16A34A', '#15803D'],
    lastMessage: 'Pago de tu viaje #00118 ya está procesado ✓',
    lastAt: days(-4),
    unread: 0,
  },
];

export interface DemoChatMessage {
  id: string;
  chatId: string;
  /** 'me' = chofer (yo), otro = contraparte. */
  from: 'me' | 'other';
  text: string;
  at: string;
  read?: boolean;
}
export const demoChatMessages: DemoChatMessage[] = [
  {
    id: 'm-1',
    chatId: 'chat-dispatch',
    from: 'me',
    text: 'Reporté una falla mecánica en el km 142. Pérdida de presión de aire.',
    at: hours(-1.95),
    read: true,
  },
  {
    id: 'm-2',
    chatId: 'chat-dispatch',
    from: 'other',
    text: 'Recibido Juan. Ya vi tu reporte y la foto. ¿Puedes mover la unidad a un acotamiento seguro?',
    at: hours(-1.92),
  },
  {
    id: 'm-3',
    chatId: 'chat-dispatch',
    from: 'me',
    text: 'Sí, ya me orillé. Hay buena visibilidad.',
    at: hours(-1.9),
    read: true,
  },
  {
    id: 'm-4',
    chatId: 'chat-dispatch',
    from: 'other',
    text: 'Perfecto. Grúa confirmada, ETA 16:00. Espera en lugar seguro y te aviso cuando llegue al km 142.',
    at: hours(-1.5),
  },
];

/* =====================================================================
 * Pagos
 * ===================================================================== */
export type PaymentStatus = 'released' | 'pending' | 'held';

export interface DemoPayment {
  id: string;
  tripFolio: string;
  client: string;
  origin: string;
  destination: string;
  /** Monto pagado al chofer (comisión). */
  amount: number;
  /** Importe bruto del viaje. */
  grossAmount: number;
  /** Anticipos / descuentos aplicados. */
  advances: number;
  tolls: number;
  status: PaymentStatus;
  /** Fecha del viaje. */
  tripDate: string;
  /** Fecha en que se liberó (si aplica). */
  releasedAt: string | null;
  bank: string | null;
}
export const demoPayments: DemoPayment[] = [
  {
    id: 'pay-118',
    tripFolio: 'G3-2026-00118',
    client: 'Coca-Cola FEMSA',
    origin: 'Toluca',
    destination: 'Puebla',
    amount: 3900,
    grossAmount: 42900,
    advances: 3500,
    tolls: 980,
    status: 'released',
    tripDate: days(-10),
    releasedAt: days(-4),
    bank: 'BBVA ··0421',
  },
  {
    id: 'pay-115',
    tripFolio: 'G3-2026-00115',
    client: 'Soriana',
    origin: 'Saltillo',
    destination: 'Reynosa',
    amount: 4100,
    grossAmount: 39200,
    advances: 2800,
    tolls: 1140,
    status: 'released',
    tripDate: days(-13),
    releasedAt: days(-11),
    bank: 'BBVA ··0421',
  },
  {
    id: 'pay-120',
    tripFolio: 'G3-2026-00120',
    client: 'Bimbo',
    origin: 'CDMX',
    destination: 'Querétaro',
    amount: 3400,
    grossAmount: 34200,
    advances: 2500,
    tolls: 720,
    status: 'pending',
    tripDate: days(-5),
    releasedAt: null,
    bank: null,
  },
  {
    id: 'pay-112',
    tripFolio: 'G3-2026-00112',
    client: 'Lala',
    origin: 'Gómez Palacio',
    destination: 'CDMX',
    amount: 2800,
    grossAmount: 28400,
    advances: 0,
    tolls: 1820,
    status: 'held',
    tripDate: days(-15),
    releasedAt: null,
    bank: null,
  },
  {
    id: 'pay-108',
    tripFolio: 'G3-2026-00108',
    client: 'Pemex',
    origin: 'Salamanca',
    destination: 'Veracruz',
    amount: 5200,
    grossAmount: 52000,
    advances: 4000,
    tolls: 1400,
    status: 'released',
    tripDate: days(-20),
    releasedAt: days(-18),
    bank: 'BBVA ··0421',
  },
];

/* =====================================================================
 * Pre-trip inspection (NOM-068-SCT-2-2014)
 * Los puntos del catálogo viven en `src/constants/inspection.ts`.
 * Aquí mantenemos solamente el estado por inspección (resultados).
 * ===================================================================== */
import type { InspectionResult } from '@/models/inspection';
import { INSPECTION_CATALOG } from '@/constants/inspection';

export const buildInitialInspection = (): InspectionResult[] =>
  INSPECTION_CATALOG.map((c) => ({
    checkpointId: c.id,
    // Demo: algunos puntos pre-marcados como OK para mostrar progreso real.
    status:
      [
        'brakes-service',
        'brakes-parking',
        'steering-play',
        'tires-tractor-front',
        'lights-main',
        'lights-brake',
        'vision-windshield',
        'fifthwheel-lock',
        'cargo-secure',
        'cabin-belts',
      ].includes(c.id)
        ? 'ok'
        : 'pending',
    photoUri: null,
    notes: null,
    aiFindings: [],
    checkedAt: null,
  }));
