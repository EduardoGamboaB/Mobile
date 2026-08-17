import { EscPosBuilder } from '@/services/printing/escpos';

describe('EscPosBuilder', () => {
  it('inicializa con ESC @', () => {
    const bytes = new EscPosBuilder(58).build();
    expect(bytes[0]).toBe(0x1b);
    expect(bytes[1]).toBe(0x40);
  });

  it('usa 32 columnas para 58 mm y 48 para 80 mm', () => {
    expect(new EscPosBuilder(58).cols).toBe(32);
    expect(new EscPosBuilder(80).cols).toBe(48);
  });

  it('row alinea izquierda y derecha al ancho del papel', () => {
    const t = new EscPosBuilder(58);
    const before = t.build().length;
    t.row('TOTAL', '$10.00');
    const bytes = t.build().slice(before);
    const text = String.fromCharCode(...bytes);
    expect(text).toBe('TOTAL' + ' '.repeat(32 - 'TOTAL$10.00'.length) + '$10.00\n');
    expect(text.trimEnd().length).toBe(32);
  });

  it('translitera acentos y ñ a ASCII', () => {
    const t = new EscPosBuilder(58);
    const before = t.build().length;
    t.text('Ñoño canción');
    const text = String.fromCharCode(...t.build().slice(before));
    expect(text).toBe('Nono cancion\n');
  });

  it('el corte parcial va al final', () => {
    const bytes = new EscPosBuilder(58).text('hola').cut().build();
    const tail = Array.from(bytes.slice(-4));
    expect(tail).toEqual([0x1d, 0x56, 0x42, 0x00]);
  });

  it('buildBase64 produce base64 válido', () => {
    const b64 = new EscPosBuilder(58).text('abc').buildBase64();
    expect(b64).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    const decoded = Buffer.from(b64, 'base64');
    expect(decoded[0]).toBe(0x1b);
  });
});
