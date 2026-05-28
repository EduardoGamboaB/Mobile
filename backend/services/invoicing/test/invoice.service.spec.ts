import { InvoiceService } from '../src/invoice.service';
import { CartaPorteGenerator } from '../src/carta-porte/generator';
import { CFDIGenerator } from '../src/cfdi/generator';
import { MockPacProvider } from '../src/pac/mock.provider';
import { sampleIngresoCFDI } from './fixtures/sample-ingreso';

function build(pacOpts = {}) {
  const generator = new CartaPorteGenerator(new CFDIGenerator());
  const pac = new MockPacProvider(pacOpts);
  const service = new InvoiceService(generator, pac);
  return { service, pac, generator };
}

describe('InvoiceService · flujo end-to-end', () => {
  describe('Stamping (timbrado)', () => {
    test('happy path: genera XML + envía a PAC + persiste resultado', async () => {
      const { service, pac } = build();

      const result = await service.stamp({
        invoiceId: 'inv_1',
        companyId: 'cmp_1',
        input: sampleIngresoCFDI(),
      });

      expect(result.status).toBe('stamped');
      expect(result.uuidSat).toBeTruthy();
      expect(result.satSeal).toContain('MOCK_SELLO_SAT_');
      expect(result.stampedXml).toContain('TimbreFiscalDigital');
      expect(pac.stamps).toHaveLength(1);
    });

    test('rejection: SAT rechaza → status=rejected con código de error', async () => {
      const { service } = build({
        failNext: true,
        errorCode: 'CP201',
        errorMessage: 'TipoUbicacion no corresponde',
      });

      const result = await service.stamp({
        invoiceId: 'inv_2',
        companyId: 'cmp_1',
        input: sampleIngresoCFDI(),
      });

      expect(result.status).toBe('rejected');
      expect(result.rejectionCode).toBe('CP201');
      expect(result.rejectionMessage).toMatch(/TipoUbicacion/);
    });

    test('error de validación previo no llega al PAC', async () => {
      const { service, pac } = build();
      const input = sampleIngresoCFDI();
      input.merchandise = []; // sin mercancías → falla validación

      await expect(service.stamp({
        invoiceId: 'inv_3',
        companyId: 'cmp_1',
        input,
      })).rejects.toThrow(/mercancía/i);

      expect(pac.stamps).toHaveLength(0); // ni siquiera tocamos al PAC
    });
  });

  describe('Garantía de reembolso', () => {
    test('si SAT rechaza por nuestro error → garantía aplicable', async () => {
      const { service } = build({
        failNext: true,
        errorCode: 'CP500',
        errorMessage: 'Error interno del PAC',
        isOurError: true,
      });

      const result = await service.stamp({
        invoiceId: 'inv_4',
        companyId: 'cmp_1',
        input: sampleIngresoCFDI(),
      });

      expect(result.status).toBe('rejected');
      expect(result.guaranteeApplicable).toBe(true);
    });

    test('si SAT rechaza por error del cliente → NO aplica garantía', async () => {
      const { service } = build({
        failNext: true,
        errorCode: 'CFDI40102',
        errorMessage: 'RFC del receptor no se encuentra en LCO',
        isOurError: false,
      });

      const result = await service.stamp({
        invoiceId: 'inv_5',
        companyId: 'cmp_1',
        input: sampleIngresoCFDI(),
      });

      expect(result.status).toBe('rejected');
      expect(result.guaranteeApplicable).toBe(false);
    });
  });

  describe('Cancelación', () => {
    test('cancela un CFDI timbrado', async () => {
      const { service, pac } = build();

      // Primero timbrar
      const stamped = await service.stamp({
        invoiceId: 'inv_6', companyId: 'cmp_1', input: sampleIngresoCFDI(),
      });

      // Luego cancelar
      const cancel = await service.cancel({
        uuidSat: stamped.uuidSat!,
        reason: '02',
        rfcIssuer: 'GLO260101AB1',
      });

      expect(cancel.ok).toBe(true);
      expect(pac.cancels).toHaveLength(1);
      expect(pac.cancels[0].reason).toBe('02');
    });

    test('motivo 01 (sustitución) requiere UUID sustituto', async () => {
      const { service } = build();

      await expect(service.cancel({
        uuidSat: 'old-uuid',
        reason: '01',
        rfcIssuer: 'GLO260101AB1',
        // sin substituteUuid → error
      })).rejects.toThrow(/sustituto/i);
    });
  });

  describe('Métricas', () => {
    test('cada timbrado registra tiempo de respuesta del PAC', async () => {
      const { service } = build({ responseDelayMs: 50 });
      const result = await service.stamp({
        invoiceId: 'inv_7', companyId: 'cmp_1', input: sampleIngresoCFDI(),
      });
      expect(result.pacResponseTime).toBeGreaterThanOrEqual(50);
    });
  });
});
