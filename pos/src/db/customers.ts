import { getDb } from './database';
import { enqueue } from './outbox';
import { newId, nowIso } from '@/utils/ids';
import type { Customer } from '@/models/types';

export const listCustomers = async (search = ''): Promise<Customer[]> => {
  if (!search) {
    return getDb().getAllAsync<Customer>('SELECT * FROM customers WHERE active = 1 ORDER BY name');
  }
  const like = `%${search}%`;
  return getDb().getAllAsync<Customer>(
    'SELECT * FROM customers WHERE active = 1 AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR taxId LIKE ?) ORDER BY name',
    [like, like, like, like],
  );
};

export const getCustomer = async (id: string): Promise<Customer | null> =>
  getDb().getFirstAsync<Customer>('SELECT * FROM customers WHERE id = ?', [id]);

export const saveCustomer = async (input: Partial<Customer> & { name: string }): Promise<Customer> => {
  const now = nowIso();
  const existing = input.id ? await getCustomer(input.id) : null;
  const customer: Customer = {
    id: input.id ?? newId(),
    name: input.name,
    phone: input.phone ?? existing?.phone ?? '',
    email: input.email ?? existing?.email ?? '',
    taxId: input.taxId ?? existing?.taxId ?? '',
    taxRegime: input.taxRegime ?? existing?.taxRegime ?? '',
    zip: input.zip ?? existing?.zip ?? '',
    cfdiUse: input.cfdiUse ?? existing?.cfdiUse ?? '',
    address: input.address ?? existing?.address ?? '',
    notes: input.notes ?? existing?.notes ?? '',
    active: input.active ?? existing?.active ?? 1,
    updatedAt: now,
  };
  await getDb().runAsync(
    `INSERT INTO customers (id, name, phone, email, taxId, taxRegime, zip, cfdiUse, address, notes, active, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name, phone=excluded.phone, email=excluded.email,
       taxId=excluded.taxId, taxRegime=excluded.taxRegime, zip=excluded.zip,
       cfdiUse=excluded.cfdiUse, address=excluded.address, notes=excluded.notes,
       active=excluded.active, updatedAt=excluded.updatedAt`,
    [
      customer.id, customer.name, customer.phone, customer.email, customer.taxId,
      customer.taxRegime, customer.zip, customer.cfdiUse, customer.address,
      customer.notes, customer.active, customer.updatedAt,
    ],
  );
  await enqueue('customers', customer.id, 'upsert', customer);
  return customer;
};

export const deactivateCustomer = async (id: string) => {
  await getDb().runAsync('UPDATE customers SET active = 0, updatedAt = ? WHERE id = ?', [nowIso(), id]);
  await enqueue('customers', id, 'delete', { id });
};

/** Historial de compras del cliente (ventas completadas). */
export const customerPurchaseStats = async (customerId: string) => {
  const row = await getDb().getFirstAsync<{ count: number; total: number | null; last: string | null }>(
    `SELECT COUNT(*) AS count, SUM(total) AS total, MAX(date) AS last
     FROM sales WHERE customerId = ? AND status = 'completed'`,
    [customerId],
  );
  return { count: row?.count ?? 0, total: row?.total ?? 0, last: row?.last ?? null };
};
