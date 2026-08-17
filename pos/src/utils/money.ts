/**
 * Utilidades de dinero. Los montos viven como enteros en centavos
 * y las cantidades como enteros en milésimas (3 decimales).
 */

export const toCents = (value: string | number): number => {
  const n = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
};

export const fromCents = (cents: number): number => cents / 100;

export const formatMoney = (cents: number, symbol = '$'): string => {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const units = Math.floor(abs / 100);
  const dec = String(abs % 100).padStart(2, '0');
  const withThousands = units.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${symbol}${withThousands}.${dec}`;
};

// Cantidades (milésimas)
export const toQty = (value: string | number): number => {
  const n = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (!isFinite(n)) return 0;
  return Math.round(n * 1000);
};

export const formatQty = (milli: number): string => {
  const n = milli / 1000;
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/\.?0+$/, '');
};

/**
 * Multiplica una cantidad en milésimas por un precio unitario en centavos.
 * Resultado en centavos, redondeado a la unidad.
 */
export const lineTotal = (qtyMilli: number, unitCents: number): number =>
  Math.round((qtyMilli * unitCents) / 1000);

/**
 * Desglosa un total (impuesto incluido) en base + impuesto según la tasa.
 * Devuelve { subtotal, tax } en centavos, subtotal + tax === total.
 */
export const splitTax = (totalCents: number, taxRatePct: number) => {
  if (taxRatePct <= 0) return { subtotal: totalCents, tax: 0 };
  const subtotal = Math.round(totalCents / (1 + taxRatePct / 100));
  return { subtotal, tax: totalCents - subtotal };
};
