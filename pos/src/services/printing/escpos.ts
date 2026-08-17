/**
 * Generador de comandos ESC/POS para impresoras térmicas (58 y 80 mm).
 * Produce bytes crudos listos para enviarse por Bluetooth. Es puro
 * (sin dependencias nativas) para poder probarse en Jest.
 */

const ESC = 0x1b;
const GS = 0x1d;

export class EscPosBuilder {
  private bytes: number[] = [];
  readonly cols: number;

  constructor(paperWidth: 58 | 80 = 58) {
    this.cols = paperWidth === 80 ? 48 : 32;
    this.raw([ESC, 0x40]); // init
    // Codepage CP437; los acentos se transliteran en encode()
    this.raw([ESC, 0x74, 0x00]);
  }

  private raw(data: number[]): this {
    this.bytes.push(...data);
    return this;
  }

  /** Translitera acentos/ñ a ASCII imprimible en cualquier impresora. */
  private encode(text: string): number[] {
    const map: Record<string, string> = {
      á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ñ: 'n', ü: 'u',
      Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ñ: 'N', Ü: 'U', '¿': '?', '¡': '!',
    };
    const ascii = text.replace(/[áéíóúñüÁÉÍÓÚÑÜ¿¡]/g, (c) => map[c] ?? c);
    return Array.from(ascii).map((c) => {
      const code = c.charCodeAt(0);
      return code >= 0x20 && code <= 0x7e ? code : 0x3f; // '?'
    });
  }

  align(mode: 'left' | 'center' | 'right'): this {
    const n = mode === 'center' ? 1 : mode === 'right' ? 2 : 0;
    return this.raw([ESC, 0x61, n]);
  }

  bold(on: boolean): this {
    return this.raw([ESC, 0x45, on ? 1 : 0]);
  }

  doubleSize(on: boolean): this {
    return this.raw([GS, 0x21, on ? 0x11 : 0x00]);
  }

  text(line = ''): this {
    this.raw(this.encode(line));
    return this.raw([0x0a]);
  }

  /** Texto con salto de línea automático al ancho del papel. */
  wrapped(text: string): this {
    const words = text.split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      if ((line + ' ' + word).trim().length > this.cols) {
        this.text(line.trim());
        line = word;
      } else {
        line = (line + ' ' + word).trim();
      }
    }
    if (line) this.text(line);
    return this;
  }

  /** Renglón con texto a la izquierda y a la derecha, relleno con espacios. */
  row(left: string, right: string): this {
    const space = this.cols - left.length - right.length;
    if (space < 1) {
      this.text(left);
      return this.align('right').text(right).align('left');
    }
    return this.text(left + ' '.repeat(space) + right);
  }

  divider(char = '-'): this {
    return this.text(char.repeat(this.cols));
  }

  feed(lines = 1): this {
    return this.raw([ESC, 0x64, lines]);
  }

  /** Código de barras CODE128 del texto dado (si la impresora lo soporta). */
  barcode(data: string): this {
    if (!data) return this;
    const payload = this.encode(data);
    this.raw([GS, 0x68, 60]); // altura
    this.raw([GS, 0x77, 2]); // ancho de módulo
    this.raw([GS, 0x48, 2]); // texto debajo
    this.raw([GS, 0x6b, 73, payload.length + 2, 0x7b, 0x42]); // CODE128 set B
    return this.raw(payload);
  }

  cut(): this {
    this.feed(3);
    return this.raw([GS, 0x56, 0x42, 0x00]); // corte parcial
  }

  build(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }

  buildBase64(): string {
    const bin = this.build();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let out = '';
    for (let i = 0; i < bin.length; i += 3) {
      const a = bin[i];
      const b = i + 1 < bin.length ? bin[i + 1] : NaN;
      const c = i + 2 < bin.length ? bin[i + 2] : NaN;
      out += chars[a >> 2];
      out += chars[((a & 3) << 4) | (isNaN(b) ? 0 : b >> 4)];
      out += isNaN(b) ? '=' : chars[((b & 15) << 2) | (isNaN(c) ? 0 : c >> 6)];
      out += isNaN(c) ? '=' : chars[c & 63];
    }
    return out;
  }
}
