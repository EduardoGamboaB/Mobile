import { getDb } from './database';
import { enqueue } from './outbox';
import { newId, nowIso } from '@/utils/ids';
import type { Product } from '@/models/types';

export const listProducts = async (search = '', onlyActive = true): Promise<Product[]> => {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (onlyActive) where.push('active = 1');
  if (search) {
    where.push('(name LIKE ? OR sku LIKE ? OR barcode LIKE ? OR category LIKE ?)');
    const like = `%${search}%`;
    args.push(like, like, like, like);
  }
  const sql = `SELECT * FROM products ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY name`;
  return getDb().getAllAsync<Product>(sql, args);
};

export const getProduct = async (id: string): Promise<Product | null> =>
  getDb().getFirstAsync<Product>('SELECT * FROM products WHERE id = ?', [id]);

export const findByBarcode = async (code: string): Promise<Product | null> =>
  getDb().getFirstAsync<Product>(
    'SELECT * FROM products WHERE (barcode = ? OR sku = ?) AND active = 1 LIMIT 1',
    [code, code],
  );

export const saveProduct = async (input: Partial<Product> & { name: string }): Promise<Product> => {
  const db = getDb();
  const now = nowIso();
  const id = input.id ?? newId();
  const existing = input.id ? await getProduct(input.id) : null;
  const product: Product = {
    id,
    sku: input.sku ?? existing?.sku ?? '',
    barcode: input.barcode ?? existing?.barcode ?? '',
    name: input.name,
    description: input.description ?? existing?.description ?? '',
    category: input.category ?? existing?.category ?? '',
    unit: input.unit ?? existing?.unit ?? 'pza',
    price: input.price ?? existing?.price ?? 0,
    cost: input.cost ?? existing?.cost ?? 0,
    taxRate: input.taxRate ?? existing?.taxRate ?? 0,
    stock: input.stock ?? existing?.stock ?? 0,
    minStock: input.minStock ?? existing?.minStock ?? 0,
    active: input.active ?? existing?.active ?? 1,
    updatedAt: now,
  };
  await db.runAsync(
    `INSERT INTO products (id, sku, barcode, name, description, category, unit, price, cost, taxRate, stock, minStock, active, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       sku=excluded.sku, barcode=excluded.barcode, name=excluded.name, description=excluded.description,
       category=excluded.category, unit=excluded.unit, price=excluded.price, cost=excluded.cost,
       taxRate=excluded.taxRate, stock=excluded.stock, minStock=excluded.minStock,
       active=excluded.active, updatedAt=excluded.updatedAt`,
    [
      product.id, product.sku, product.barcode, product.name, product.description,
      product.category, product.unit, product.price, product.cost, product.taxRate,
      product.stock, product.minStock, product.active, product.updatedAt,
    ],
  );
  await enqueue('products', product.id, 'upsert', product);
  return product;
};

export const deactivateProduct = async (id: string) => {
  await getDb().runAsync('UPDATE products SET active = 0, updatedAt = ? WHERE id = ?', [nowIso(), id]);
  await enqueue('products', id, 'delete', { id });
};

export const listCategories = async (): Promise<string[]> => {
  const rows = await getDb().getAllAsync<{ category: string }>(
    "SELECT DISTINCT category FROM products WHERE category != '' AND active = 1 ORDER BY category",
  );
  return rows.map((r) => r.category);
};

export const lowStockProducts = async (): Promise<Product[]> =>
  getDb().getAllAsync<Product>(
    'SELECT * FROM products WHERE active = 1 AND minStock > 0 AND stock <= minStock ORDER BY stock ASC',
  );
