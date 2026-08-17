import { EscPosBuilder } from './escpos';
import { formatMoney, formatQty } from '@/utils/money';
import { formatDate } from '@/utils/ids';
import type { BusinessSettings, Sale, SaleItem } from '@/models/types';

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other: 'Otro',
};

/** Construye los bytes ESC/POS del ticket de venta. */
export const buildSaleTicket = (
  settings: BusinessSettings,
  sale: Sale,
  items: SaleItem[],
): EscPosBuilder => {
  const t = new EscPosBuilder(settings.paperWidth);
  const s = settings.currencySymbol;

  t.align('center').doubleSize(true).text(settings.name).doubleSize(false);
  if (settings.legalName) t.text(settings.legalName);
  if (settings.taxId) t.text(`RFC: ${settings.taxId}`);
  if (settings.address) t.wrapped(settings.address);
  if (settings.phone) t.text(`Tel: ${settings.phone}`);
  if (settings.ticketHeader) t.wrapped(settings.ticketHeader);

  t.align('left').divider();
  t.row(`Ticket #${sale.folio}`, formatDate(sale.date));
  if (sale.customerName) t.text(`Cliente: ${sale.customerName}`);
  t.divider();

  for (const item of items) {
    t.wrapped(item.productName);
    t.row(
      `  ${formatQty(item.qty)} x ${formatMoney(item.unitPrice, s)}`,
      formatMoney(item.total, s),
    );
  }

  t.divider();
  t.row('Subtotal', formatMoney(sale.subtotal, s));
  t.row('Impuestos', formatMoney(sale.tax, s));
  if (sale.discount > 0) t.row('Descuento', `-${formatMoney(sale.discount, s)}`);
  t.bold(true).row('TOTAL', formatMoney(sale.total, s)).bold(false);
  t.divider();
  t.row(PAYMENT_LABEL[sale.paymentMethod] ?? sale.paymentMethod, formatMoney(sale.amountPaid, s));
  if (sale.change > 0) t.row('Cambio', formatMoney(sale.change, s));

  if (settings.ticketFooter) {
    t.feed(1).align('center').wrapped(settings.ticketFooter);
  }
  t.align('center').feed(1).barcode(`T${String(sale.folio).padStart(8, '0')}`);
  t.cut();
  return t;
};

/** Versión HTML del ticket, para vista previa y compartir como PDF. */
export const buildSaleTicketHtml = (
  settings: BusinessSettings,
  sale: Sale,
  items: SaleItem[],
): string => {
  const s = settings.currencySymbol;
  const esc = (x: string) =>
    x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rows = items
    .map(
      (i) => `
      <tr><td colspan="2">${esc(i.productName)}</td></tr>
      <tr class="sub"><td>${formatQty(i.qty)} × ${formatMoney(i.unitPrice, s)}</td>
      <td class="r">${formatMoney(i.total, s)}</td></tr>`,
    )
    .join('');
  const logo = settings.logoUri
    ? `<img src="${settings.logoUri}" style="max-width:120px;max-height:80px;object-fit:contain" />`
    : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    body { font-family: 'Courier New', monospace; font-size: 12px; width: ${settings.paperWidth === 80 ? '76mm' : '54mm'}; margin: 0 auto; color: #000; }
    .c { text-align: center; } .r { text-align: right; }
    h1 { font-size: 16px; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 1px 0; vertical-align: top; }
    .sub td { color: #333; }
    hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    .total { font-size: 14px; font-weight: bold; }
  </style></head><body>
  <div class="c">${logo}<h1>${esc(settings.name)}</h1>
    ${settings.legalName ? `<div>${esc(settings.legalName)}</div>` : ''}
    ${settings.taxId ? `<div>RFC: ${esc(settings.taxId)}</div>` : ''}
    ${settings.address ? `<div>${esc(settings.address)}</div>` : ''}
    ${settings.phone ? `<div>Tel: ${esc(settings.phone)}</div>` : ''}
  </div><hr>
  <table><tr><td>Ticket #${sale.folio}</td><td class="r">${formatDate(sale.date)}</td></tr></table>
  ${sale.customerName ? `<div>Cliente: ${esc(sale.customerName)}</div>` : ''}
  <hr><table>${rows}</table><hr>
  <table>
    <tr><td>Subtotal</td><td class="r">${formatMoney(sale.subtotal, s)}</td></tr>
    <tr><td>Impuestos</td><td class="r">${formatMoney(sale.tax, s)}</td></tr>
    ${sale.discount > 0 ? `<tr><td>Descuento</td><td class="r">-${formatMoney(sale.discount, s)}</td></tr>` : ''}
    <tr class="total"><td>TOTAL</td><td class="r">${formatMoney(sale.total, s)}</td></tr>
    <tr><td>${PAYMENT_LABEL[sale.paymentMethod] ?? sale.paymentMethod}</td><td class="r">${formatMoney(sale.amountPaid, s)}</td></tr>
    ${sale.change > 0 ? `<tr><td>Cambio</td><td class="r">${formatMoney(sale.change, s)}</td></tr>` : ''}
  </table>
  ${settings.ticketFooter ? `<hr><div class="c">${esc(settings.ticketFooter)}</div>` : ''}
  </body></html>`;
};
