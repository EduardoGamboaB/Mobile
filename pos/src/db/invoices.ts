import { getDb, nextFolio } from './database';
import { enqueue } from './outbox';
import { setSaleInvoice } from './sales';
import { newId, nowIso } from '@/utils/ids';
import type { Invoice, Sale } from '@/models/types';

export interface InvoiceCustomerInput {
  customerName: string;
  customerTaxId: string;
  customerTaxRegime: string;
  customerZip: string;
  cfdiUse: string;
}

export const createInvoice = async (
  sale: Sale,
  customer: InvoiceCustomerInput,
  series: string,
): Promise<Invoice> => {
  const folio = await nextFolio('invoices');
  const now = nowIso();
  const invoice: Invoice = {
    id: newId(),
    saleId: sale.id,
    series,
    folio,
    date: now,
    status: 'issued',
    customerName: customer.customerName,
    customerTaxId: customer.customerTaxId,
    customerTaxRegime: customer.customerTaxRegime,
    customerZip: customer.customerZip,
    cfdiUse: customer.cfdiUse,
    subtotal: sale.subtotal,
    tax: sale.tax,
    total: sale.total,
    updatedAt: now,
  };
  await getDb().runAsync(
    `INSERT INTO invoices (id, saleId, series, folio, date, status, customerName, customerTaxId, customerTaxRegime, customerZip, cfdiUse, subtotal, tax, total, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      invoice.id, invoice.saleId, invoice.series, invoice.folio, invoice.date, invoice.status,
      invoice.customerName, invoice.customerTaxId, invoice.customerTaxRegime, invoice.customerZip,
      invoice.cfdiUse, invoice.subtotal, invoice.tax, invoice.total, invoice.updatedAt,
    ],
  );
  await setSaleInvoice(sale.id, invoice.id);
  await enqueue('invoices', invoice.id, 'upsert', invoice);
  return invoice;
};

export const listInvoices = async (limit = 200): Promise<Invoice[]> =>
  getDb().getAllAsync<Invoice>('SELECT * FROM invoices ORDER BY date DESC LIMIT ?', [limit]);

export const getInvoice = async (id: string): Promise<Invoice | null> =>
  getDb().getFirstAsync<Invoice>('SELECT * FROM invoices WHERE id = ?', [id]);

export const cancelInvoice = async (id: string) => {
  const now = nowIso();
  await getDb().runAsync("UPDATE invoices SET status = 'cancelled', updatedAt = ? WHERE id = ?", [now, id]);
  const invoice = await getInvoice(id);
  if (invoice) await enqueue('invoices', id, 'upsert', invoice);
};
