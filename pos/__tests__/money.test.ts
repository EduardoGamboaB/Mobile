import { toCents, formatMoney, toQty, formatQty, lineTotal, splitTax } from '@/utils/money';

describe('money utils', () => {
  it('convierte texto a centavos', () => {
    expect(toCents('10')).toBe(1000);
    expect(toCents('10.5')).toBe(1050);
    expect(toCents('10.555')).toBe(1056);
    expect(toCents('1,234.56')).toBe(123456);
    expect(toCents('')).toBe(0);
    expect(toCents('abc')).toBe(0);
  });

  it('formatea centavos como moneda', () => {
    expect(formatMoney(0)).toBe('$0.00');
    expect(formatMoney(1050)).toBe('$10.50');
    expect(formatMoney(123456789)).toBe('$1,234,567.89');
    expect(formatMoney(-1050)).toBe('-$10.50');
    expect(formatMoney(1050, 'Q')).toBe('Q10.50');
  });

  it('maneja cantidades en milésimas', () => {
    expect(toQty('1')).toBe(1000);
    expect(toQty('0.5')).toBe(500);
    expect(toQty('2.345')).toBe(2345);
    expect(formatQty(1000)).toBe('1');
    expect(formatQty(2345)).toBe('2.345');
    expect(formatQty(500)).toBe('0.5');
  });

  it('calcula el total de línea qty × precio', () => {
    expect(lineTotal(1000, 1050)).toBe(1050); // 1 × $10.50
    expect(lineTotal(500, 1000)).toBe(500); // 0.5 × $10.00
    expect(lineTotal(3000, 333)).toBe(999); // 3 × $3.33
  });

  it('desglosa impuesto incluido en el precio', () => {
    const { subtotal, tax } = splitTax(11600, 16);
    expect(subtotal).toBe(10000);
    expect(tax).toBe(1600);
    expect(subtotal + tax).toBe(11600);
    expect(splitTax(1000, 0)).toEqual({ subtotal: 1000, tax: 0 });
  });
});
