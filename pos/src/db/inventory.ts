import { getDb } from './database';
import { enqueue } from './outbox';
import { newId, nowIso } from '@/utils/ids';
import type { InventoryMovement, MovementType, Product } from '@/models/types';

/**
 * Aplica un movimiento de inventario: actualiza el stock del producto y
 * registra el kardex. `qtyMilli` lleva signo (+entrada / −salida).
 * Devuelve el producto actualizado para que el llamador evalúe alertas.
 */
export const applyMovement = async (
  productId: string,
  type: MovementType,
  qtyMilli: number,
  reference: string,
  notes = '',
): Promise<Product | null> => {
  const db = getDb();
  const product = await db.getFirstAsync<Product>('SELECT * FROM products WHERE id = ?', [productId]);
  if (!product) return null;

  const stockAfter = product.stock + qtyMilli;
  const now = nowIso();
  await db.runAsync('UPDATE products SET stock = ?, updatedAt = ? WHERE id = ?', [
    stockAfter,
    now,
    productId,
  ]);

  const movement: InventoryMovement = {
    id: newId(),
    productId,
    productName: product.name,
    type,
    qty: qtyMilli,
    stockAfter,
    reference,
    date: now,
    notes,
  };
  await db.runAsync(
    `INSERT INTO inventory_movements (id, productId, productName, type, qty, stockAfter, reference, date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      movement.id, movement.productId, movement.productName, movement.type,
      movement.qty, movement.stockAfter, movement.reference, movement.date, movement.notes,
    ],
  );
  await enqueue('movements', movement.id, 'upsert', movement);
  return { ...product, stock: stockAfter, updatedAt: now };
};

export const listMovements = async (productId?: string, limit = 100): Promise<InventoryMovement[]> => {
  if (productId) {
    return getDb().getAllAsync<InventoryMovement>(
      'SELECT * FROM inventory_movements WHERE productId = ? ORDER BY date DESC LIMIT ?',
      [productId, limit],
    );
  }
  return getDb().getAllAsync<InventoryMovement>(
    'SELECT * FROM inventory_movements ORDER BY date DESC LIMIT ?',
    [limit],
  );
};

export interface InventorySummary {
  totalProducts: number;
  totalUnits: number; // milésimas
  totalCost: number; // centavos: stock * costo
  totalRetail: number; // centavos: stock * precio
  lowStockCount: number;
  outOfStockCount: number;
}

export const inventorySummary = async (): Promise<InventorySummary> => {
  const row = await getDb().getFirstAsync<{
    totalProducts: number;
    totalUnits: number | null;
    totalCost: number | null;
    totalRetail: number | null;
    lowStockCount: number | null;
    outOfStockCount: number | null;
  }>(
    `SELECT
       COUNT(*) AS totalProducts,
       SUM(stock) AS totalUnits,
       SUM(CAST(stock * cost / 1000.0 AS INTEGER)) AS totalCost,
       SUM(CAST(stock * price / 1000.0 AS INTEGER)) AS totalRetail,
       SUM(CASE WHEN minStock > 0 AND stock <= minStock AND stock > 0 THEN 1 ELSE 0 END) AS lowStockCount,
       SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END) AS outOfStockCount
     FROM products WHERE active = 1`,
  );
  return {
    totalProducts: row?.totalProducts ?? 0,
    totalUnits: row?.totalUnits ?? 0,
    totalCost: row?.totalCost ?? 0,
    totalRetail: row?.totalRetail ?? 0,
    lowStockCount: row?.lowStockCount ?? 0,
    outOfStockCount: row?.outOfStockCount ?? 0,
  };
};
