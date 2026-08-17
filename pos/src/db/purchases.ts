import { getDb, nextFolio } from './database';
import { enqueue } from './outbox';
import { applyMovement } from './inventory';
import { newId, nowIso } from '@/utils/ids';
import { splitTax } from '@/utils/money';
import type { Purchase, PurchaseItem } from '@/models/types';

export interface PurchaseLineInput {
  productId: string;
  productName: string;
  qty: number; // milésimas
  unitCost: number; // centavos
  taxRate: number; // % (para el desglose del total)
}

export interface CreatePurchaseInput {
  supplierId: string | null;
  supplierName: string;
  lines: PurchaseLineInput[];
  notes?: string;
}

/**
 * Registra una compra recibida: crea el documento, sube el stock de cada
 * producto y actualiza su último costo.
 */
export const createPurchase = async (input: CreatePurchaseInput): Promise<Purchase> => {
  const db = getDb();
  const folio = await nextFolio('purchases');
  const now = nowIso();

  let subtotal = 0;
  let tax = 0;
  let total = 0;
  for (const line of input.lines) {
    const lineTotal = Math.round((line.qty * line.unitCost) / 1000);
    const parts = splitTax(lineTotal, line.taxRate);
    subtotal += parts.subtotal;
    tax += parts.tax;
    total += lineTotal;
  }

  const purchase: Purchase = {
    id: newId(),
    folio,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    date: now,
    status: 'received',
    subtotal,
    tax,
    total,
    notes: input.notes ?? '',
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO purchases (id, folio, supplierId, supplierName, date, status, subtotal, tax, total, notes, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      purchase.id, purchase.folio, purchase.supplierId, purchase.supplierName, purchase.date,
      purchase.status, purchase.subtotal, purchase.tax, purchase.total, purchase.notes, purchase.updatedAt,
    ],
  );

  const items: PurchaseItem[] = [];
  for (const line of input.lines) {
    const item: PurchaseItem = {
      id: newId(),
      purchaseId: purchase.id,
      productId: line.productId,
      productName: line.productName,
      qty: line.qty,
      unitCost: line.unitCost,
      total: Math.round((line.qty * line.unitCost) / 1000),
    };
    items.push(item);
    await db.runAsync(
      `INSERT INTO purchase_items (id, purchaseId, productId, productName, qty, unitCost, total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [item.id, item.purchaseId, item.productId, item.productName, item.qty, item.unitCost, item.total],
    );
    await applyMovement(line.productId, 'purchase', line.qty, `Compra #${folio}`);
    await db.runAsync('UPDATE products SET cost = ?, updatedAt = ? WHERE id = ?', [
      line.unitCost,
      now,
      line.productId,
    ]);
  }

  await enqueue('purchases', purchase.id, 'upsert', { ...purchase, items });
  return purchase;
};

export const listPurchases = async (fromIso?: string, toIso?: string, limit = 200): Promise<Purchase[]> => {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (fromIso) { where.push('date >= ?'); args.push(fromIso); }
  if (toIso) { where.push('date <= ?'); args.push(toIso); }
  args.push(limit);
  return getDb().getAllAsync<Purchase>(
    `SELECT * FROM purchases ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY date DESC LIMIT ?`,
    args,
  );
};

export const getPurchase = async (id: string): Promise<Purchase | null> =>
  getDb().getFirstAsync<Purchase>('SELECT * FROM purchases WHERE id = ?', [id]);

export const listPurchaseItems = async (purchaseId: string): Promise<PurchaseItem[]> =>
  getDb().getAllAsync<PurchaseItem>('SELECT * FROM purchase_items WHERE purchaseId = ?', [purchaseId]);
