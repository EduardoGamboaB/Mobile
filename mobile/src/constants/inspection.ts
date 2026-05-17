/**
 * Catálogo de inspección pre-viaje conforme a la
 * NOM-068-SCT-2-2014: "Transporte terrestre — Servicio de autotransporte
 * federal de pasajeros, turismo, carga y transporte privado — Condiciones
 * físico-mecánicas y de seguridad para la operación en caminos y puentes
 * de jurisdicción federal."
 *
 * Cada checkpoint incluye:
 *   - severidad (critical / major / minor) y si bloquea salida
 *   - foto obligatoria u opcional
 *   - hint para el agente AI `analyzeInspectionPhoto` (qué buscar)
 *   - referencia normativa
 */

export const InspectionSeverity = {
  Critical: 'critical',
  Major: 'major',
  Minor: 'minor',
} as const;
export type InspectionSeverityValue = (typeof InspectionSeverity)[keyof typeof InspectionSeverity];

export const InspectionSeverityLabel: Record<InspectionSeverityValue, string> = {
  critical: 'Crítico',
  major: 'Mayor',
  minor: 'Menor',
};

export const InspectionCategory = {
  Brakes: 'brakes',
  Steering: 'steering',
  Tires: 'tires',
  Lights: 'lights',
  Vision: 'vision',
  Body: 'body',
  FifthWheel: 'fifthwheel',
  Cargo: 'cargo',
  Emergency: 'emergency',
  Cabin: 'cabin',
  Documents: 'documents',
  Fluids: 'fluids',
  Evidence: 'evidence',
} as const;
export type InspectionCategoryValue =
  (typeof InspectionCategory)[keyof typeof InspectionCategory];

export const InspectionCategoryMeta: Record<
  InspectionCategoryValue,
  { label: string; icon: string }
> = {
  brakes:     { label: 'Frenos y aire',          icon: 'pause' },
  steering:   { label: 'Dirección y suspensión', icon: 'compass' },
  tires:      { label: 'Llantas y rines',        icon: 'truck' },
  lights:     { label: 'Luces y reflejantes',    icon: 'zap' },
  vision:     { label: 'Visión y parabrisas',    icon: 'image' },
  body:       { label: 'Carrocería y chasis',    icon: 'truck' },
  fifthwheel: { label: 'Quinta rueda y enganche', icon: 'package' },
  cargo:      { label: 'Carga y amarre',         icon: 'package' },
  emergency:  { label: 'Equipo de emergencia',   icon: 'alert' },
  cabin:      { label: 'Cabina y operador',      icon: 'user' },
  documents:  { label: 'Documentos a bordo',     icon: 'file' },
  fluids:     { label: 'Aceite y refrigerante',  icon: 'fuel' },
  evidence:   { label: 'Evidencia general',      icon: 'camera' },
};

export interface InspectionCheckpoint {
  id: string;
  category: InspectionCategoryValue;
  label: string;
  description: string;
  severity: InspectionSeverityValue;
  /** Si está pendiente y es crítico, bloquea el botón "Iniciar viaje". */
  blocksDeparture: boolean;
  /** Foto requerida vs opcional. */
  photoRequired: boolean;
  /** Pista para el agente AI: qué debe buscar en la foto. */
  aiAnalysisHint: string;
  /** Referencia normativa NOM-068-SCT-2-2014. */
  reference: string;
}

/**
 * Catálogo NOM-068 — 28 puntos cubriendo los 13 ejes de la norma.
 * Severidad asignada conforme al riesgo operativo declarado en la NOM.
 */
export const INSPECTION_CATALOG: InspectionCheckpoint[] = [
  // ── Frenos y aire ───────────────────────────────────────────────────────
  {
    id: 'brakes-service',
    category: 'brakes',
    label: 'Frenos de servicio',
    description:
      'Mangueras, balatas y cámaras sin fugas ni desgaste excesivo. Presión de aire de 120 PSI estable.',
    severity: 'critical',
    blocksDeparture: true,
    photoRequired: false,
    aiAnalysisHint:
      'Detectar fugas visibles en mangueras, manchas de aceite, balatas desgastadas o cámaras dañadas.',
    reference: 'NOM-068 § 6.1 — Sistema de frenado',
  },
  {
    id: 'brakes-parking',
    category: 'brakes',
    label: 'Freno de estacionamiento',
    description: 'Activa y libera correctamente; sostiene la unidad en pendiente.',
    severity: 'critical',
    blocksDeparture: true,
    photoRequired: false,
    aiAnalysisHint: '—',
    reference: 'NOM-068 § 6.1.4',
  },
  {
    id: 'brakes-abs',
    category: 'brakes',
    label: 'Indicador ABS',
    description: 'Lámpara del sistema ABS apaga después del autodiagnóstico.',
    severity: 'major',
    blocksDeparture: false,
    photoRequired: false,
    aiAnalysisHint: '—',
    reference: 'NOM-068 § 6.1.6',
  },

  // ── Dirección y suspensión ──────────────────────────────────────────────
  {
    id: 'steering-play',
    category: 'steering',
    label: 'Juego del volante',
    description: 'Máximo 25° de juego libre. Sin vibración ni desviación.',
    severity: 'critical',
    blocksDeparture: true,
    photoRequired: false,
    aiAnalysisHint: '—',
    reference: 'NOM-068 § 6.2.1',
  },
  {
    id: 'suspension',
    category: 'steering',
    label: 'Suspensión',
    description: 'Muelles/bolsas de aire íntegros, amortiguadores sin fugas.',
    severity: 'major',
    blocksDeparture: false,
    photoRequired: true,
    aiAnalysisHint:
      'Buscar muelles rotos, bolsas de aire infladas, manchas de aceite en amortiguadores.',
    reference: 'NOM-068 § 6.3',
  },

  // ── Llantas y rines ─────────────────────────────────────────────────────
  {
    id: 'tires-tractor-front',
    category: 'tires',
    label: 'Llantas delanteras tracto',
    description:
      'Profundidad de cocada ≥ 4 mm. Sin cortes, abultamientos ni desgaste irregular.',
    severity: 'critical',
    blocksDeparture: true,
    photoRequired: true,
    aiAnalysisHint:
      'Estimar profundidad de dibujo, detectar cortes laterales, abultamientos, desgaste asimétrico.',
    reference: 'NOM-068 § 6.4.1 — Eje direccional',
  },
  {
    id: 'tires-tractor-rear',
    category: 'tires',
    label: 'Llantas traseras tracto',
    description: 'Profundidad ≥ 2 mm. Sin cordel expuesto.',
    severity: 'critical',
    blocksDeparture: true,
    photoRequired: true,
    aiAnalysisHint: 'Cordel expuesto, dispar de medidas entre duales, presión uniforme.',
    reference: 'NOM-068 § 6.4.2',
  },
  {
    id: 'tires-trailer',
    category: 'tires',
    label: 'Llantas del remolque',
    description: 'Profundidad ≥ 1.6 mm. Estado general de las 8 llantas.',
    severity: 'critical',
    blocksDeparture: true,
    photoRequired: true,
    aiAnalysisHint: 'Llantas planas, dispar de inflado, daño en flanco.',
    reference: 'NOM-068 § 6.4.3',
  },
  {
    id: 'tires-spare',
    category: 'tires',
    label: 'Llanta de refacción y herramienta',
    description: 'Llanta de refacción inflada y herramienta de cambio completa.',
    severity: 'minor',
    blocksDeparture: false,
    photoRequired: false,
    aiAnalysisHint: '—',
    reference: 'NOM-068 § 6.4.6',
  },

  // ── Luces y reflejantes ─────────────────────────────────────────────────
  {
    id: 'lights-main',
    category: 'lights',
    label: 'Faros delanteros (alta y baja)',
    description: 'Ambos faros encienden, lentes íntegros, sin opacidad.',
    severity: 'critical',
    blocksDeparture: true,
    photoRequired: false,
    aiAnalysisHint: '—',
    reference: 'NOM-068 § 6.5.1',
  },
  {
    id: 'lights-brake',
    category: 'lights',
    label: 'Luces de freno y direccionales',
    description: 'Direccionales delanteras/traseras y luces de frenado operativas.',
    severity: 'critical',
    blocksDeparture: true,
    photoRequired: false,
    aiAnalysisHint: '—',
    reference: 'NOM-068 § 6.5.2',
  },
  {
    id: 'lights-position',
    category: 'lights',
    label: 'Luces de posición y reflejantes',
    description: 'Reflejantes laterales y traseros del remolque visibles e íntegros.',
    severity: 'major',
    blocksDeparture: false,
    photoRequired: true,
    aiAnalysisHint:
      'Reflejantes laterales completos en remolque, sin desprenderse; luz de posición visible.',
    reference: 'NOM-068 § 6.5.4 — Reflejantes obligatorios',
  },
  {
    id: 'lights-reverse',
    category: 'lights',
    label: 'Luces de reversa y placa',
    description: 'Luz de reversa y luz de placa funcionales.',
    severity: 'major',
    blocksDeparture: false,
    photoRequired: false,
    aiAnalysisHint: '—',
    reference: 'NOM-068 § 6.5.3',
  },

  // ── Visión y parabrisas ─────────────────────────────────────────────────
  {
    id: 'vision-windshield',
    category: 'vision',
    label: 'Parabrisas',
    description: 'Sin fisuras en zona de visión del conductor.',
    severity: 'critical',
    blocksDeparture: true,
    photoRequired: true,
    aiAnalysisHint:
      'Detectar grietas estrelladas, fisuras horizontales mayores a 30 cm en zona crítica.',
    reference: 'NOM-068 § 6.6.1',
  },
  {
    id: 'vision-wipers',
    category: 'vision',
    label: 'Limpiaparabrisas y agua',
    description: 'Plumas en buen estado, depósito con líquido.',
    severity: 'major',
    blocksDeparture: false,
    photoRequired: false,
    aiAnalysisHint: '—',
    reference: 'NOM-068 § 6.6.2',
  },
  {
    id: 'vision-mirrors',
    category: 'vision',
    label: 'Espejos retrovisores',
    description: 'Ambos espejos laterales íntegros, sin vibración.',
    severity: 'major',
    blocksDeparture: false,
    photoRequired: false,
    aiAnalysisHint: '—',
    reference: 'NOM-068 § 6.6.3',
  },

  // ── Carrocería y chasis ─────────────────────────────────────────────────
  {
    id: 'body-frame',
    category: 'body',
    label: 'Chasis y carrocería',
    description:
      'Sin grietas estructurales, soldaduras visibles, ni oxidación que comprometa la integridad.',
    severity: 'major',
    blocksDeparture: false,
    photoRequired: true,
    aiAnalysisHint:
      'Grietas en largueros, oxidación estructural, abolladuras profundas en cabina o caja.',
    reference: 'NOM-068 § 6.7',
  },
  {
    id: 'body-mudflaps',
    category: 'body',
    label: 'Faldas guardabarros',
    description: 'Salpicaderas en todas las llantas, sin desprendimiento.',
    severity: 'minor',
    blocksDeparture: false,
    photoRequired: false,
    aiAnalysisHint: '—',
    reference: 'NOM-068 § 6.7.4',
  },

  // ── Quinta rueda y enganche ─────────────────────────────────────────────
  {
    id: 'fifthwheel-lock',
    category: 'fifthwheel',
    label: 'Bloqueo de quinta rueda',
    description: 'Mecanismo enganchado correctamente, perno asegurado, sin juego.',
    severity: 'critical',
    blocksDeparture: true,
    photoRequired: true,
    aiAnalysisHint:
      'Verificar perno insertado en posición de bloqueo, palanca asegurada, ausencia de holgura visible.',
    reference: 'NOM-068 § 6.8.1',
  },
  {
    id: 'fifthwheel-lube',
    category: 'fifthwheel',
    label: 'Lubricación quinta rueda',
    description: 'Plato lubricado uniformemente.',
    severity: 'minor',
    blocksDeparture: false,
    photoRequired: false,
    aiAnalysisHint: '—',
    reference: 'NOM-068 § 6.8.2',
  },

  // ── Carga y amarre ──────────────────────────────────────────────────────
  {
    id: 'cargo-secure',
    category: 'cargo',
    label: 'Carga amarrada',
    description:
      'Carga sujetada con cinchos/cadenas conforme al peso y geometría. Sin sobresalir del perímetro.',
    severity: 'critical',
    blocksDeparture: true,
    photoRequired: true,
    aiAnalysisHint:
      'Cinchos/cadenas tensos, distribución pareja, lona cubriendo carga descubierta, sin sobre-pasos.',
    reference: 'NOM-068 § 7 — Sujeción de carga',
  },
  {
    id: 'cargo-distribution',
    category: 'cargo',
    label: 'Distribución de peso',
    description: 'Peso dentro del Peso Bruto Vehicular autorizado.',
    severity: 'critical',
    blocksDeparture: true,
    photoRequired: false,
    aiAnalysisHint: '—',
    reference: 'NOM-068 § 7.3',
  },

  // ── Equipo de emergencia ────────────────────────────────────────────────
  {
    id: 'emer-extinguisher',
    category: 'emergency',
    label: 'Extintor de incendios',
    description:
      'ABC mínimo 4.5 kg, vigente. Manómetro en zona verde y sello sin manipular.',
    severity: 'critical',
    blocksDeparture: true,
    photoRequired: true,
    aiAnalysisHint:
      'Verificar manómetro en zona verde, fecha de recarga vigente (etiqueta legible), sello sin romper.',
    reference: 'NOM-068 § 8.1',
  },
  {
    id: 'emer-triangles',
    category: 'emergency',
    label: 'Triángulos / banderines',
    description: 'Mínimo 3 triángulos reflejantes o banderines visibles.',
    severity: 'major',
    blocksDeparture: false,
    photoRequired: false,
    aiAnalysisHint: '—',
    reference: 'NOM-068 § 8.2',
  },
  {
    id: 'emer-firstaid',
    category: 'emergency',
    label: 'Botiquín de primeros auxilios',
    description: 'Botiquín completo, sin medicamentos caducos.',
    severity: 'major',
    blocksDeparture: false,
    photoRequired: false,
    aiAnalysisHint: '—',
    reference: 'NOM-068 § 8.3',
  },
  {
    id: 'emer-chocks',
    category: 'emergency',
    label: 'Cuñas de seguridad',
    description: 'Mínimo 2 cuñas para inmovilización.',
    severity: 'minor',
    blocksDeparture: false,
    photoRequired: false,
    aiAnalysisHint: '—',
    reference: 'NOM-068 § 8.4',
  },

  // ── Cabina y operador ───────────────────────────────────────────────────
  {
    id: 'cabin-belts',
    category: 'cabin',
    label: 'Cinturones de seguridad',
    description: 'Cinturón del conductor y acompañante funcionales.',
    severity: 'critical',
    blocksDeparture: true,
    photoRequired: false,
    aiAnalysisHint: '—',
    reference: 'NOM-068 § 6.9.1',
  },
  {
    id: 'cabin-horn',
    category: 'cabin',
    label: 'Claxon',
    description: 'Audible y funcional.',
    severity: 'minor',
    blocksDeparture: false,
    photoRequired: false,
    aiAnalysisHint: '—',
    reference: 'NOM-068 § 6.9.2',
  },

  // ── Documentos a bordo ──────────────────────────────────────────────────
  {
    id: 'doc-license',
    category: 'documents',
    label: 'Licencia federal vigente',
    description: 'Tipo y vigencia conforme al servicio.',
    severity: 'critical',
    blocksDeparture: true,
    photoRequired: true,
    aiAnalysisHint:
      'OCR: nombre, número de licencia, tipo (B/E), fecha de vencimiento.',
    reference: 'LCPF Art. 36 / NOM-087',
  },
  {
    id: 'doc-registration',
    category: 'documents',
    label: 'Tarjeta de circulación',
    description: 'Tracto y remolque, vigentes.',
    severity: 'critical',
    blocksDeparture: true,
    photoRequired: true,
    aiAnalysisHint: 'OCR placas, serie, vigencia.',
    reference: 'NOM-068 § 9.1',
  },
  {
    id: 'doc-insurance',
    category: 'documents',
    label: 'Póliza de seguro RC',
    description: 'Responsabilidad civil obligatoria, vigente.',
    severity: 'critical',
    blocksDeparture: true,
    photoRequired: true,
    aiAnalysisHint: 'OCR aseguradora, póliza, vigencia, cobertura mínima.',
    reference: 'LCPF Art. 63',
  },
  {
    id: 'doc-cartaporte',
    category: 'documents',
    label: 'Carta porte / CFDI 4.0',
    description: 'Carta porte vigente con complemento CFDI 4.0.',
    severity: 'critical',
    blocksDeparture: true,
    photoRequired: true,
    aiAnalysisHint:
      'OCR: folio, emisor, receptor, productos, toneladas, IDCCP, origen-destino.',
    reference: 'SAT / RMF 2024',
  },
  {
    id: 'doc-permit',
    category: 'documents',
    label: 'Permiso SICT',
    description: 'Permiso o concesión federal vigente.',
    severity: 'critical',
    blocksDeparture: true,
    photoRequired: false,
    aiAnalysisHint: '—',
    reference: 'LCPF Art. 8',
  },

  // ── Aceite y refrigerante ───────────────────────────────────────────────
  {
    id: 'fluids-oil',
    category: 'fluids',
    label: 'Nivel de aceite del motor',
    description: 'Entre min y max en la varilla.',
    severity: 'major',
    blocksDeparture: false,
    photoRequired: false,
    aiAnalysisHint: '—',
    reference: 'NOM-068 § 6.10.1',
  },
  {
    id: 'fluids-coolant',
    category: 'fluids',
    label: 'Nivel de refrigerante',
    description: 'Depósito en rango operativo.',
    severity: 'major',
    blocksDeparture: false,
    photoRequired: false,
    aiAnalysisHint: '—',
    reference: 'NOM-068 § 6.10.2',
  },

  // ── Evidencia general ───────────────────────────────────────────────────
  {
    id: 'evidence-overall',
    category: 'evidence',
    label: 'Foto general de la unidad',
    description: 'Tracto + remolque visibles en una sola toma lateral.',
    severity: 'minor',
    blocksDeparture: false,
    photoRequired: true,
    aiAnalysisHint:
      'Daños mayores visibles en carrocería, abolladuras profundas, óxido estructural.',
    reference: 'Procedimiento G3 — registro fotográfico',
  },
];

export const INSPECTION_BY_CATEGORY: Record<
  InspectionCategoryValue,
  InspectionCheckpoint[]
> = INSPECTION_CATALOG.reduce(
  (acc, c) => {
    (acc[c.category] ??= []).push(c);
    return acc;
  },
  {} as Record<InspectionCategoryValue, InspectionCheckpoint[]>,
);
