import { getDb, nextFolio } from './database';
import { enqueue } from './outbox';
import { applyMovement } from './inventory';
import { checkLowStock } from '@/services/alerts';
import { newId, nowIso } from '@/utils/ids';
import { computeTotals, type CartLine } from '@/utils/totals';
import type { PaymentMethod, Sale, SaleItem } from '@/models/types';

export interface CreateSaleInput {
  lines: CartLine[];
  discount: number; // centavos
  paymentMethod: PaymentMethod;
  amountPaid: number; // centavos
  customerId?: string | null;
  customerName?: string;
}

export const createSale = async (input: CreateSaleInput): Promise<Sale> => {
  const db = getDb();
  const totals = computeTotals(input.lines, input.discount);
  const folio = await nextFolio('sales');
  const now = nowIso();
  const sale: Sale = {
    id: newId(),
    folio,
    date: now,
    status: 'completed',
    customerId: input.customerId ?? null,
    customerName: input.customerName ?? '',
    subtotal: totals.subtotal,
    tax: totals.tax,
    discount: totals.discount,
    total: totals.total,
    paymentMethod: input.paymentMethod,
    amountPaid: input.amountPaid,
    change: Math.max(input.amountPaid - totals.total, 0),
    invoiceId: null,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO sales (id, folio, date, status, customerId, customerName, subtotal, tax, discount, total, paymentMethod, amountPaid, change, invoiceId, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sale.id, sale.folio, sale.date, sale.status, sale.customerId, sale.customerName,
      sale.subtotal, sale.tax, sale.discount, sale.total, sale.paymentMethod,
      sale.amountPaid, sale.change, sale.invoiceId, sale.updatedAt,
    ],
  );

  const items: SaleItem[] = [];
  for (const line of input.lines) {
    const item: SaleItem = {
      id: newId(),
      saleId: sale.id,
      productId: line.productId,
      productName: line.name,
      qty: line.qty,
      unitPrice: line.unitPrice,
      taxRate: line.taxRate,
      total: Math.round((line.qty * line.unitPrice) / 1000),
    };
    items.push(item);
    await db.runAsync(
      `INSERT INTO sale_items (id, saleId, productId, productName, qty, unitPrice, taxRate, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.id, item.saleId, item.productId, item.productName, item.qty, item.unitPrice, item.taxRate, item.total],
    );
    const updated = await applyMovement(line.productId, 'sale', -line.qty, `Venta #${folio}`);
    if (updated) await checkLowStock(updated);
  }

  await enqueue('sales', sale.id, 'upsert', { ...sale, items });
  return sale;
};

export const cancelSale = async (saleId: string): Promise<void> => {
  const db = getDb();
  const sale = await getSale(saleId);
  if (!sale || sale.status === 'cancelled') return;
  const now = nowIso();
  await db.runAsync("UPDATE sales SET status = 'cancelled', updatedAt = ? WHERE id = ?", [now, saleId]);
  const items = await listSaleItems(saleId);
  for (const item of items) {
    await applyMovement(item.productId, 'adjustment', item.qty, `Cancelación venta #${sale.folio}`);
  }
  await enqueue('sales', saleId, 'upsert', { ...sale, status: 'cancelled', updatedAt: now });
};

export const getSale = async (id: string): Promise<Sale | null> =>
  getDb().getFirstAsync<Sale>('SELECT * FROM sales WHERE id = ?', [id]);

export const listSaleItems = async (saleId: string): Promise<SaleItem[]> =>
  getDb().getAllAsync<SaleItem>('SELECT * FROM sale_items WHERE saleId = ?', [saleId]);

export const listSales = async (fromIso?: string, toIso?: string, limit = 200): Promise<Sale[]> => {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (fromIso) { where.push('date >= ?'); args.push(fromIso); }
  if (toIso) { where.push('date <= ?'); args.push(toIso); }
  args.push(limit);
  return getDb().getAllAsync<Sale>(
    `SELECT * FROM sales ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY date DESC LIMIT ?`,
    args,
  );
};

export const setSaleInvoice = async (saleId: string, invoiceId: string) => {
  await getDb().runAsync('UPDATE sales SET invoiceId = ?, updatedAt = ? WHERE id = ?', [
    invoiceId,
    nowIso(),
    saleId,
  ]);
};
