import { CartaPorteGenerator } from '../src/carta-porte/generator';
import { CFDIGenerator } from '../src/cfdi/generator';
import { sampleIngresoCFDI } from './fixtures/sample-ingreso';

function build() {
  return new CartaPorteGenerator(new CFDIGenerator());
}

describe('CartaPorteGenerator · estructura del XML CFDI 4.0 + Carta Porte 3.0', () => {
  describe('Tipo Ingreso (transportista cobra)', () => {
    test('genera XML válido con todos los nodos requeridos', () => {
      const xml = build().generate(sampleIngresoCFDI());

      // CFDI 4.0 raíz
      expect(xml).toContain('<cfdi:Comprobante');
      expect(xml).toContain('Version="4.0"');
      expect(xml).toContain('TipoDeComprobante="I"');

      // Complemento Carta Porte 3.0
      expect(xml).toContain('<cartaporte30:CartaPorte');
      expect(xml).toContain('Version="3.0"');
      expect(xml).toContain('TranspInternac="No"');
      expect(xml).toContain('<cartaporte30:Ubicaciones>');
      expect(xml).toContain('<cartaporte30:Mercancias');  // tag con atributos
      expect(xml).toContain('<cartaporte30:Autotransporte');
      expect(xml).toContain('<cartaporte30:FiguraTransporte>');
    });

    test('incluye ubicación de origen y destino con IDs auto-generados', () => {
      const xml = build().generate(sampleIngresoCFDI());

      expect(xml).toMatch(/TipoUbicacion="Origen"\s+IDUbicacion="OR\d{6}"/);
      expect(xml).toMatch(/TipoUbicacion="Destino"\s+IDUbicacion="DE\d{6}"/);
    });

    test('incluye al menos una mercancía con clave producto/servicio del SAT', () => {
      const xml = build().generate(sampleIngresoCFDI());

      expect(xml).toContain('<cartaporte30:Mercancia');
      expect(xml).toMatch(/BienesTransp="\d{8}"/);
      expect(xml).toMatch(/PesoEnKg="[\d.]+"/);
    });

    test('incluye datos del autotransporte con permiso SCT', () => {
      const xml = build().generate(sampleIngresoCFDI());

      expect(xml).toMatch(/PermSCT="TPAF\d{2}"/);
      expect(xml).toMatch(/NumPermisoSCT="[A-Z0-9\-\/]+"/);
      expect(xml).toMatch(/ConfigVehicular="[A-Z0-9]+"/);  // T3S2, T01, C2R2, etc.
      expect(xml).toMatch(/PlacaVM="[A-Z0-9-]+"/);
    });

    test('incluye operador con RFC y licencia federal', () => {
      const xml = build().generate(sampleIngresoCFDI());

      expect(xml).toContain('TipoFigura="01"');
      expect(xml).toMatch(/NumLicencia="[A-Z0-9]+"/);
      expect(xml).toMatch(/RFCFigura="[A-Z0-9]{12,13}"/);
    });
  });

  describe('Tipo Traslado (dueño mueve su carga)', () => {
    test('TipoDeComprobante=T y monto subtotal=0', () => {
      const input = sampleIngresoCFDI();
      input.cfdiType = 'T';
      input.subtotal = 0;
      input.iva = 0;
      input.total = 0;

      const xml = build().generate(input);
      expect(xml).toContain('TipoDeComprobante="T"');
      expect(xml).toContain('SubTotal="0"');
    });

    test('Traslado nacional no requiere fracción arancelaria', () => {
      const input = sampleIngresoCFDI();
      input.cfdiType = 'T';
      input.merchandise[0].tariffCode = undefined;

      const xml = build().generate(input);
      expect(xml).not.toContain('FraccionArancelaria=');
    });
  });

  describe('Validaciones de negocio', () => {
    test('rechaza si peso total de mercancías < 0', () => {
      const input = sampleIngresoCFDI();
      input.merchandise[0].weightKg = -10;
      expect(() => build().generate(input)).toThrow(/peso.*negativo/i);
    });

    test('rechaza si distancia total < suma de tramos', () => {
      const input = sampleIngresoCFDI();
      input.totalDistanceKm = 100;
      input.locations[1].distanceToNextKm = 200;
      expect(() => build().generate(input)).toThrow(/distancia/i);
    });

    test('rechaza si no hay operador asignado', () => {
      const input = sampleIngresoCFDI();
      input.operators = [];
      expect(() => build().generate(input)).toThrow(/operador/i);
    });

    test('rechaza si tracto sin placas', () => {
      const input = sampleIngresoCFDI();
      input.autotransport.plateVm = '';
      expect(() => build().generate(input)).toThrow(/placa/i);
    });

    test('mercancía peligrosa requiere UN code', () => {
      const input = sampleIngresoCFDI();
      input.merchandise[0].isDangerous = true;
      input.merchandise[0].unCode = undefined;
      expect(() => build().generate(input)).toThrow(/UN/i);
    });
  });

  describe('Internacional', () => {
    test('TranspInternac=Sí requiere datos aduanales', () => {
      const input = sampleIngresoCFDI();
      input.transportInternational = true;
      input.entranceExit = 'Salida';
      input.country = 'USA';

      const xml = build().generate(input);
      expect(xml).toContain('TranspInternac="Sí"');
      expect(xml).toContain('EntradaSalidaMerc="Salida"');
      expect(xml).toContain('PaisOrigenDestino="USA"');
    });
  });

  describe('Mercancías múltiples', () => {
    test('soporta varias mercancías con sus propios pesos y valores', () => {
      const input = sampleIngresoCFDI();
      input.merchandise.push({
        sequence: 2,
        productServiceCode: '24112400',
        description: 'Cemento blanco 50kg',
        quantity: 100,
        unitCode: 'SAC',
        weightKg: 5000,
        valueAmount: 75000,
        isDangerous: false,
      });
      const xml = build().generate(input);
      // Debe contener 2 elementos Mercancia (start tags)
      const merchTags = (xml.match(/<cartaporte30:Mercancia\s/g) || []).length;
      expect(merchTags).toBe(2);
    });
  });

  describe('Idempotencia y consistencia', () => {
    test('mismo input + mismo idCCP genera mismo output (regeneración tras error)', () => {
      const input = sampleIngresoCFDI();
      input.fechaEmision = '2026-05-28T10:00:00';
      input.idCCP = 'CCCdeadbeef-0000-0000-0000-000000000001';
      const a = build().generate(input);
      const b = build().generate(input);
      expect(a).toBe(b);
    });
  });
});
