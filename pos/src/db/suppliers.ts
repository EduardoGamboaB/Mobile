import { getDb } from './database';
import { enqueue } from './outbox';
import { newId, nowIso } from '@/utils/ids';
import type { Supplier } from '@/models/types';

export const listSuppliers = async (search = ''): Promise<Supplier[]> => {
  if (!search) {
    return getDb().getAllAsync<Supplier>('SELECT * FROM suppliers WHERE active = 1 ORDER BY name');
  }
  const like = `%${search}%`;
  return getDb().getAllAsync<Supplier>(
    'SELECT * FROM suppliers WHERE active = 1 AND (name LIKE ? OR contactName LIKE ? OR taxId LIKE ?) ORDER BY name',
    [like, like, like],
  );
};

export const getSupplier = async (id: string): Promise<Supplier | null> =>
  getDb().getFirstAsync<Supplier>('SELECT * FROM suppliers WHERE id = ?', [id]);

export const saveSupplier = async (input: Partial<Supplier> & { name: string }): Promise<Supplier> => {
  const now = nowIso();
  const existing = input.id ? await getSupplier(input.id) : null;
  const supplier: Supplier = {
    id: input.id ?? newId(),
    name: input.name,
    contactName: input.contactName ?? existing?.contactName ?? '',
    phone: input.phone ?? existing?.phone ?? '',
    email: input.email ?? existing?.email ?? '',
    taxId: input.taxId ?? existing?.taxId ?? '',
    address: input.address ?? existing?.address ?? '',
    notes: input.notes ?? existing?.notes ?? '',
    active: input.active ?? existing?.active ?? 1,
    updatedAt: now,
  };
  await getDb().runAsync(
    `INSERT INTO suppliers (id, name, contactName, phone, email, taxId, address, notes, active, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name, contactName=excluded.contactName, phone=excluded.phone,
       email=excluded.email, taxId=excluded.taxId, address=excluded.address,
       notes=excluded.notes, active=excluded.active, updatedAt=excluded.updatedAt`,
    [
      supplier.id, supplier.name, supplier.contactName, supplier.phone, supplier.email,
      supplier.taxId, supplier.address, supplier.notes, supplier.active, supplier.updatedAt,
    ],
  );
  await enqueue('suppliers', supplier.id, 'upsert', supplier);
  return supplier;
};

export const deactivateSupplier = async (id: string) => {
  await getDb().runAsync('UPDATE suppliers SET active = 0, updatedAt = ? WHERE id = ?', [nowIso(), id]);
  await enqueue('suppliers', id, 'delete', { id });
};
