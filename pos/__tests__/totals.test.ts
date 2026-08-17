import { computeTotals, type CartLine } from '@/utils/totals';

const line = (overrides: Partial<CartLine> = {}): CartLine => ({
  productId: 'p1',
  name: 'Producto',
  qty: 1000,
  unitPrice: 11600, // $116.00 con 16 % incluido
  taxRate: 16,
  ...overrides,
});

describe('computeTotals', () => {
  it('carrito vacío', () => {
    const t = computeTotals([]);
    expect(t.total).toBe(0);
    expect(t.subtotal).toBe(0);
    expect(t.tax).toBe(0);
    expect(t.itemCount).toBe(0);
  });

  it('una línea con impuesto incluido', () => {
    const t = computeTotals([line()]);
    expect(t.total).toBe(11600);
    expect(t.subtotal).toBe(10000);
    expect(t.tax).toBe(1600);
    expect(t.subtotal + t.tax).toBe(t.total);
  });

  it('varias líneas con tasas mixtas: subtotal + impuesto = total', () => {
    const t = computeTotals([
      line(),
      line({ productId: 'p2', unitPrice: 5000, taxRate: 0, qty: 2000 }),
      line({ productId: 'p3', unitPrice: 999, taxRate: 8, qty: 3000 }),
    ]);
    expect(t.total).toBe(11600 + 10000 + 2997);
    expect(t.subtotal + t.tax).toBe(t.total);
  });

  it('descuento se aplica y prorratea sin perder centavos', () => {
    const t = computeTotals([line(), line({ productId: 'p2', unitPrice: 3333, taxRate: 16 })], 1000);
    expect(t.discount).toBe(1000);
    expect(t.total).toBe(11600 + 3333 - 1000);
    expect(t.subtotal + t.tax).toBe(t.total);
  });

  it('descuento mayor al total se limita al total', () => {
    const t = computeTotals([line({ unitPrice: 500, taxRate: 0 })], 99999);
    expect(t.total).toBe(0);
    expect(t.discount).toBe(500);
  });

  it('cantidades fraccionarias (granel)', () => {
    const t = computeTotals([line({ qty: 1500, unitPrice: 4640, taxRate: 16 })]); // 1.5 kg × $46.40
    expect(t.total).toBe(6960);
    expect(t.subtotal + t.tax).toBe(t.total);
    expect(t.unitCount).toBe(1500);
  });
});
