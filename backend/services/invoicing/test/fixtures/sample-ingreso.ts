import type { CartaPorteInput } from '../../src/carta-porte/types';

export function sampleIngresoCFDI(): CartaPorteInput {
  return {
    cfdiType: 'I',
    series: 'CP',
    folio: '00001',
    fechaEmision: '2026-05-28T10:00:00',

    issuer: {
      rfc: 'GLO260101AB1',
      name: 'G3 LOGISTICS SA DE CV',
      taxRegime: '601', // General de Ley Personas Morales
    },
    receiver: {
      rfc: 'GBS210101XYZ',
      name: 'GRUPO BIMBO SA DE CV',
      zip: '02300',
      taxRegime: '601',
      useCfdi: 'G03', // Gastos en general
    },

    subtotal: 18500,
    iva: 2960,
    total: 21460,
    paymentForm: '03',  // Transferencia electrónica
    paymentMethod: 'PUE',

    transportInternational: false,
    totalDistanceKm: 720,

    locations: [
      {
        type: 'Origen',
        rfc: 'GLO260101AB1',
        name: 'G3 LOGISTICS',
        zip: '02300',
        state: 'CDMX',
        scheduledDate: '2026-05-28T06:30:00',
        distanceToNextKm: 0, // origen no tiene distancia previa
      },
      {
        type: 'Destino',
        rfc: 'GBS210101XYZ',
        name: 'BIMBO MONTERREY',
        zip: '64000',
        state: 'NLE',
        scheduledDate: '2026-05-28T17:30:00',
        distanceToNextKm: 720,
      },
    ],

    merchandise: [
      {
        sequence: 1,
        productServiceCode: '50212200', // Productos panificados
        description: 'Pan industrial empacado · 1000 cajas',
        quantity: 1000,
        unitCode: 'XBX', // Box
        weightKg: 12000,
        valueAmount: 850000,
        isDangerous: false,
      },
    ],

    autotransport: {
      permSct: 'TPAF01',  // Autotransporte de carga general
      permNumber: 'PA-CF-12345/2024',
      config: 'T3S2', // Tracto 3 ejes · semi-remolque 2 ejes
      plateVm: 'AB-12-34',
      vehicleYear: 2022,
      insuranceCivilCompany: 'Quálitas Compañía de Seguros',
      insuranceCivilPolicy: 'QLT-2026-MX-009876',
      trailers: [
        {
          subtype: 'CTR004', // Caja seca 53'
          plate: 'TR-99-88',
        },
      ],
    },

    operators: [
      {
        typeFigura: '01',
        rfc: 'PEPE800101ABC',
        name: 'PEDRO PEREZ HERNANDEZ',
        federalLicenseNumber: 'F1234567',
      },
    ],
  };
}
