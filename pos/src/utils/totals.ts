import { lineTotal, splitTax } from './money';

export interface CartLine {
  productId: string;
  name: string;
  qty: number; // milésimas
  unitPrice: number; // centavos, impuesto incluido
  taxRate: number; // %
}

export interface CartTotals {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  itemCount: number; // renglones
  unitCount: number; // milésimas totales
}

/**
 * Calcula los totales del carrito. `discountCents` se aplica sobre el total
 * y el desglose de impuestos se hace línea por línea, prorrateando el
 * descuento de forma proporcional.
 */
export const computeTotals = (lines: CartLine[], discountCents = 0): CartTotals => {
  const gross = lines.reduce((acc, l) => acc + lineTotal(l.qty, l.unitPrice), 0);
  const discount = Math.min(Math.max(discountCents, 0), gross);
  const net = gross - discount;

  let subtotal = 0;
  let tax = 0;
  let applied = 0;

  lines.forEach((l, idx) => {
    const lineGross = lineTotal(l.qty, l.unitPrice);
    let lineNet: number;
    if (idx === lines.length - 1) {
      lineNet = lineGross - (discount - applied); // el último renglón absorbe el residuo
    } else {
      const lineDiscount = gross > 0 ? Math.round((discount * lineGross) / gross) : 0;
      applied += lineDiscount;
      lineNet = lineGross - lineDiscount;
    }
    const parts = splitTax(lineNet, l.taxRate);
    subtotal += parts.subtotal;
    tax += parts.tax;
  });

  return {
    subtotal,
    tax,
    discount,
    total: net,
    itemCount: lines.length,
    unitCount: lines.reduce((acc, l) => acc + l.qty, 0),
  };
};
