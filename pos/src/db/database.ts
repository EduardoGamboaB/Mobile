import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const getDb = (): SQLite.SQLiteDatabase => {
  if (!db) db = SQLite.openDatabaseSync('pos.db');
  return db;
};

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL DEFAULT '',
  barcode TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT 'pza',
  price INTEGER NOT NULL DEFAULT 0,
  cost INTEGER NOT NULL DEFAULT 0,
  taxRate REAL NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  minStock INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contactName TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  taxId TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  taxId TEXT NOT NULL DEFAULT '',
  taxRegime TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL DEFAULT '',
  cfdiUse TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  folio INTEGER NOT NULL,
  supplierId TEXT,
  supplierName TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal INTEGER NOT NULL DEFAULT 0,
  tax INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);

CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY,
  purchaseId TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  productId TEXT NOT NULL,
  productName TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unitCost INTEGER NOT NULL,
  total INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchaseId);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  folio INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  customerId TEXT,
  customerName TEXT NOT NULL DEFAULT '',
  subtotal INTEGER NOT NULL DEFAULT 0,
  tax INTEGER NOT NULL DEFAULT 0,
  discount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  paymentMethod TEXT NOT NULL DEFAULT 'cash',
  amountPaid INTEGER NOT NULL DEFAULT 0,
  change INTEGER NOT NULL DEFAULT 0,
  invoiceId TEXT,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);

CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  saleId TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  productId TEXT NOT NULL,
  productName TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unitPrice INTEGER NOT NULL,
  taxRate REAL NOT NULL DEFAULT 0,
  total INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(saleId);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  productId TEXT NOT NULL,
  productName TEXT NOT NULL,
  type TEXT NOT NULL,
  qty INTEGER NOT NULL,
  stockAfter INTEGER NOT NULL,
  reference TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_movements_product ON inventory_movements(productId);
CREATE INDEX IF NOT EXISTS idx_movements_date ON inventory_movements(date);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  saleId TEXT NOT NULL,
  series TEXT NOT NULL DEFAULT 'A',
  folio INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued',
  customerName TEXT NOT NULL DEFAULT '',
  customerTaxId TEXT NOT NULL DEFAULT '',
  customerTaxRegime TEXT NOT NULL DEFAULT '',
  customerZip TEXT NOT NULL DEFAULT '',
  cfdiUse TEXT NOT NULL DEFAULT '',
  subtotal INTEGER NOT NULL DEFAULT 0,
  tax INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  refId TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_notifications_date ON notifications(date);

CREATE TABLE IF NOT EXISTS outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL,
  entityId TEXT NOT NULL,
  op TEXT NOT NULL,
  payload TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  lastError TEXT NOT NULL DEFAULT ''
);
`;

/**
 * Migraciones aditivas para bases creadas con esquemas anteriores.
 * Cada ALTER falla de forma inofensiva si la columna ya existe.
 */
const MIGRATIONS = ["ALTER TABLE sales ADD COLUMN customerId TEXT"];

export const initDatabase = async (): Promise<void> => {
  const db = getDb();
  await db.execAsync(SCHEMA);
  for (const migration of MIGRATIONS) {
    try {
      await db.execAsync(migration);
    } catch {
      // columna ya existente
    }
  }
};

/** Folio consecutivo por tipo de documento (sales, purchases, invoices). */
export const nextFolio = async (name: string): Promise<number> => {
  const database = getDb();
  await database.runAsync(
    'INSERT INTO counters (name, value) VALUES (?, 1) ON CONFLICT(name) DO UPDATE SET value = value + 1',
    [name],
  );
  const row = await database.getFirstAsync<{ value: number }>(
    'SELECT value FROM counters WHERE name = ?',
    [name],
  );
  return row?.value ?? 1;
};
