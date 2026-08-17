import { getDb } from '@/db/database';

export interface SalesReport {
  count: number;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  avgTicket: number;
  byPayment: { paymentMethod: string; count: number; total: number }[];
  byDay: { day: string; count: number; total: number }[];
  topProducts: { productId: string; productName: string; qty: number; total: number }[];
}

export const salesReport = async (fromIso: string, toIso: string): Promise<SalesReport> => {
  const db = getDb();
  const args = [fromIso, toIso];
  const head = await db.getFirstAsync<{
    count: number; total: number | null; subtotal: number | null; tax: number | null; discount: number | null;
  }>(
    `SELECT COUNT(*) AS count, SUM(total) AS total, SUM(subtotal) AS subtotal, SUM(tax) AS tax, SUM(discount) AS discount
     FROM sales WHERE status = 'completed' AND date >= ? AND date <= ?`,
    args,
  );
  const byPayment = await db.getAllAsync<{ paymentMethod: string; count: number; total: number }>(
    `SELECT paymentMethod, COUNT(*) AS count, SUM(total) AS total
     FROM sales WHERE status = 'completed' AND date >= ? AND date <= ?
     GROUP BY paymentMethod ORDER BY total DESC`,
    args,
  );
  const byDay = await db.getAllAsync<{ day: string; count: number; total: number }>(
    `SELECT substr(date, 1, 10) AS day, COUNT(*) AS count, SUM(total) AS total
     FROM sales WHERE status = 'completed' AND date >= ? AND date <= ?
     GROUP BY day ORDER BY day DESC`,
    args,
  );
  const topProducts = await db.getAllAsync<{ productId: string; productName: string; qty: number; total: number }>(
    `SELECT si.productId, si.productName, SUM(si.qty) AS qty, SUM(si.total) AS total
     FROM sale_items si JOIN sales s ON s.id = si.saleId
     WHERE s.status = 'completed' AND s.date >= ? AND s.date <= ?
     GROUP BY si.productId, si.productName ORDER BY total DESC LIMIT 10`,
    args,
  );
  const count = head?.count ?? 0;
  const total = head?.total ?? 0;
  return {
    count,
    total,
    subtotal: head?.subtotal ?? 0,
    tax: head?.tax ?? 0,
    discount: head?.discount ?? 0,
    avgTicket: count > 0 ? Math.round(total / count) : 0,
    byPayment,
    byDay,
    topProducts,
  };
};

export interface PurchasesReport {
  count: number;
  total: number;
  bySupplier: { supplierName: string; count: number; total: number }[];
  topProducts: { productId: string; productName: string; qty: number; total: number }[];
}

export const purchasesReport = async (fromIso: string, toIso: string): Promise<PurchasesReport> => {
  const db = getDb();
  const args = [fromIso, toIso];
  const head = await db.getFirstAsync<{ count: number; total: number | null }>(
    `SELECT COUNT(*) AS count, SUM(total) AS total
     FROM purchases WHERE status = 'received' AND date >= ? AND date <= ?`,
    args,
  );
  const bySupplier = await db.getAllAsync<{ supplierName: string; count: number; total: number }>(
    `SELECT supplierName, COUNT(*) AS count, SUM(total) AS total
     FROM purchases WHERE status = 'received' AND date >= ? AND date <= ?
     GROUP BY supplierName ORDER BY total DESC`,
    args,
  );
  const topProducts = await db.getAllAsync<{ productId: string; productName: string; qty: number; total: number }>(
    `SELECT pi.productId, pi.productName, SUM(pi.qty) AS qty, SUM(pi.total) AS total
     FROM purchase_items pi JOIN purchases p ON p.id = pi.purchaseId
     WHERE p.status = 'received' AND p.date >= ? AND p.date <= ?
     GROUP BY pi.productId, pi.productName ORDER BY total DESC LIMIT 10`,
    args,
  );
  return {
    count: head?.count ?? 0,
    total: head?.total ?? 0,
    bySupplier,
    topProducts,
  };
};
