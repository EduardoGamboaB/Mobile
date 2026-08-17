import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatMoney, formatQty } from '@/utils/money';
import { formatDate } from '@/utils/ids';
import type { BusinessSettings, Invoice, SaleItem } from '@/models/types';

/**
 * Genera el PDF de la factura y abre la hoja de compartir del sistema.
 * El documento incluye los datos fiscales del emisor (Configuración) y del
 * receptor. Para timbrado CFDI/e-invoice conecta tu PAC en el backend de
 * sincronización; este PDF sirve como representación imprimible.
 */
export const shareInvoicePdf = async (
  settings: BusinessSettings,
  invoice: Invoice,
  items: SaleItem[],
): Promise<void> => {
  const s = settings.currencySymbol;
  const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rows = items
    .map(
      (i) => `<tr>
        <td>${esc(i.productName)}</td>
        <td class="r">${formatQty(i.qty)}</td>
        <td class="r">${formatMoney(i.unitPrice, s)}</td>
        <td class="r">${formatMoney(i.total, s)}</td>
      </tr>`,
    )
    .join('');
  const logo = settings.logoUri
    ? `<img src="${settings.logoUri}" style="max-width:140px;max-height:90px;object-fit:contain" />`
    : '';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #0F172A; padding: 24px; }
    h1 { font-size: 20px; margin: 0; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; }
    .box { border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-top: 12px; }
    .muted { color: #64748B; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { text-align: left; background: #F1F5F9; padding: 6px; font-size: 11px; }
    td { padding: 6px; border-bottom: 1px solid #E2E8F0; }
    .r { text-align: right; }
    .totals { margin-top: 12px; margin-left: auto; width: 220px; }
    .totals div { display: flex; justify-content: space-between; padding: 2px 0; }
    .grand { font-size: 15px; font-weight: bold; border-top: 2px solid #0F172A; margin-top: 4px; padding-top: 4px; }
    .status { color: ${invoice.status === 'cancelled' ? '#DC2626' : '#16A34A'}; font-weight: bold; }
  </style></head><body>
    <div class="head">
      <div>
        ${logo}
        <h1>${esc(settings.legalName || settings.name)}</h1>
        <div class="muted">${esc(settings.taxId)} · ${esc(settings.taxRegime)}</div>
        <div class="muted">${esc(settings.address)}</div>
        <div class="muted">${esc(settings.phone)} · ${esc(settings.email)}</div>
      </div>
      <div style="text-align:right">
        <h1>Factura ${esc(invoice.series)}-${invoice.folio}</h1>
        <div class="muted">${formatDate(invoice.date)}</div>
        <div class="status">${invoice.status === 'cancelled' ? 'CANCELADA' : 'EMITIDA'}</div>
      </div>
    </div>
    <div class="box">
      <strong>Receptor</strong><br/>
      ${esc(invoice.customerName)}<br/>
      <span class="muted">${esc(invoice.customerTaxId)} · ${esc(invoice.customerTaxRegime)}</span><br/>
      <span class="muted">C.P. ${esc(invoice.customerZip)} · Uso: ${esc(invoice.cfdiUse)}</span>
    </div>
    <table>
      <tr><th>Concepto</th><th class="r">Cantidad</th><th class="r">P. unitario</th><th class="r">Importe</th></tr>
      ${rows}
    </table>
    <div class="totals">
      <div><span>Subtotal</span><span>${formatMoney(invoice.subtotal, s)}</span></div>
      <div><span>Impuestos</span><span>${formatMoney(invoice.tax, s)}</span></div>
      <div class="grand"><span>Total</span><span>${formatMoney(invoice.total, s)}</span></div>
    </div>
  </body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Factura ${invoice.series}-${invoice.folio}`,
    });
  } else {
    await Print.printAsync({ html });
  }
};
