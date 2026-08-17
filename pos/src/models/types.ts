/**
 * Modelo de datos del POS genérico.
 * Todos los montos se manejan en centavos (enteros) para evitar
 * errores de punto flotante; ver utils/money.ts.
 */

export type ID = string;

// ── Configuración del negocio ────────────────────────────────────────────────

export interface BusinessSettings {
  name: string;
  legalName: string;
  taxId: string; // RFC / NIT / CUIT según país
  taxRegime: string;
  address: string;
  phone: string;
  email: string;
  logoUri: string | null;
  currency: string; // código ISO, ej. MXN, USD
  currencySymbol: string;
  taxRate: number; // % por defecto para productos nuevos, ej. 16
  ticketHeader: string;
  ticketFooter: string;
  invoiceSeries: string;
  printerName: string;
  printerAddress: string; // MAC de la impresora térmica Bluetooth
  paperWidth: 58 | 80; // mm
  syncUrl: string; // endpoint REST del backend (vacío = solo offline)
  syncApiKey: string;
}

export const DEFAULT_SETTINGS: BusinessSettings = {
  name: 'Mi Negocio',
  legalName: '',
  taxId: '',
  taxRegime: '',
  address: '',
  phone: '',
  email: '',
  logoUri: null,
  currency: 'MXN',
  currencySymbol: '$',
  taxRate: 16,
  ticketHeader: '',
  ticketFooter: '¡Gracias por su compra!',
  invoiceSeries: 'A',
  printerName: '',
  printerAddress: '',
  paperWidth: 58,
  syncUrl: '',
  syncApiKey: '',
};

// ── Catálogo ─────────────────────────────────────────────────────────────────

export interface Product {
  id: ID;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  category: string;
  unit: string; // pza, kg, lt…
  price: number; // centavos, precio de venta con impuesto incluido
  cost: number; // centavos, último costo de compra
  taxRate: number; // %
  stock: number; // en milésimas de unidad (3 decimales) para soportar granel
  minStock: number;
  active: number; // 1 | 0
  updatedAt: string;
}

export interface Supplier {
  id: ID;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  taxId: string;
  address: string;
  notes: string;
  active: number;
  updatedAt: string;
}

// ── Compras ──────────────────────────────────────────────────────────────────

export type PurchaseStatus = 'draft' | 'received' | 'cancelled';

export interface Purchase {
  id: ID;
  folio: number;
  supplierId: ID | null;
  supplierName: string;
  date: string;
  status: PurchaseStatus;
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
  updatedAt: string;
}

export interface PurchaseItem {
  id: ID;
  purchaseId: ID;
  productId: ID;
  productName: string;
  qty: number; // milésimas
  unitCost: number; // centavos
  total: number; // centavos
}

// ── Ventas ───────────────────────────────────────────────────────────────────

export type SaleStatus = 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other';

export interface Sale {
  id: ID;
  folio: number;
  date: string;
  status: SaleStatus;
  customerName: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  invoiceId: ID | null;
  updatedAt: string;
}

export interface SaleItem {
  id: ID;
  saleId: ID;
  productId: ID;
  productName: string; // snapshot al momento de la venta
  qty: number; // milésimas
  unitPrice: number; // centavos
  taxRate: number;
  total: number; // centavos
}

// ── Inventario ───────────────────────────────────────────────────────────────

export type MovementType = 'sale' | 'purchase' | 'adjustment' | 'initial';

export interface InventoryMovement {
  id: ID;
  productId: ID;
  productName: string;
  type: MovementType;
  qty: number; // milésimas, con signo (+entrada / −salida)
  stockAfter: number;
  reference: string; // folio de venta/compra o motivo del ajuste
  date: string;
  notes: string;
}

// ── Facturación ──────────────────────────────────────────────────────────────

export type InvoiceStatus = 'pending' | 'issued' | 'cancelled';

export interface Invoice {
  id: ID;
  saleId: ID;
  series: string;
  folio: number;
  date: string;
  status: InvoiceStatus;
  customerName: string;
  customerTaxId: string;
  customerTaxRegime: string;
  customerZip: string;
  cfdiUse: string; // uso de CFDI (México) o campo libre en otros países
  subtotal: number;
  tax: number;
  total: number;
  updatedAt: string;
}

// ── Notificaciones ───────────────────────────────────────────────────────────

export type NotificationType = 'low_stock' | 'out_of_stock' | 'sync' | 'system';

export interface AppNotification {
  id: ID;
  type: NotificationType;
  title: string;
  body: string;
  refId: string; // id de la entidad relacionada (producto, venta…)
  date: string;
  read: number; // 1 | 0
}

// ── Sincronización (outbox pattern) ──────────────────────────────────────────

export type OutboxOp = 'upsert' | 'delete';

export interface OutboxEntry {
  id: number;
  entity: string; // products | suppliers | purchases | sales | invoices | movements
  entityId: ID;
  op: OutboxOp;
  payload: string; // JSON
  createdAt: string;
  attempts: number;
  lastError: string;
}
