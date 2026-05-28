import type { CartaPorteInput } from '../carta-porte/types';

/**
 * Genera la envolvente CFDI 4.0 (sin el complemento Carta Porte).
 * El CartaPorteGenerator inyecta el complemento dentro.
 */
export class CFDIGenerator {
  /** Renderiza el inicio del <cfdi:Comprobante> + Emisor/Receptor/Conceptos. */
  renderHeader(input: CartaPorteInput): string {
    const { issuer, receiver, fechaEmision, series, folio,
            cfdiType, subtotal, iva, total, paymentForm, paymentMethod } = input;

    const concept = this.renderConcept(input);

    return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:cartaporte30="http://www.sat.gob.mx/CartaPorte30"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd
                      http://www.sat.gob.mx/CartaPorte30 http://www.sat.gob.mx/sitio_internet/cfd/CartaPorte/CartaPorte30.xsd"
  Version="4.0"
  Serie="${this.esc(series)}"
  Folio="${this.esc(folio)}"
  Fecha="${this.esc(fechaEmision)}"
  TipoDeComprobante="${cfdiType}"
  SubTotal="${this.money(subtotal)}"
  Total="${this.money(total)}"
  Moneda="MXN"
  Exportacion="01"
  LugarExpedicion="${this.esc(input.locations[0].zip)}"
  FormaPago="${paymentForm}"
  MetodoPago="${paymentMethod}">
  <cfdi:Emisor
    Rfc="${this.esc(issuer.rfc)}"
    Nombre="${this.esc(issuer.name)}"
    RegimenFiscal="${issuer.taxRegime}"/>
  <cfdi:Receptor
    Rfc="${this.esc(receiver.rfc)}"
    Nombre="${this.esc(receiver.name)}"
    DomicilioFiscalReceptor="${receiver.zip}"
    RegimenFiscalReceptor="${receiver.taxRegime}"
    UsoCFDI="${receiver.useCfdi}"/>
  <cfdi:Conceptos>
${concept}
  </cfdi:Conceptos>
${cfdiType === 'I' ? this.renderImpuestos(iva) : ''}`;
  }

  renderFooter(): string {
    return `\n</cfdi:Comprobante>`;
  }

  private renderConcept(input: CartaPorteInput): string {
    // Para tipo Ingreso (transportista cobra), un concepto único de servicio
    if (input.cfdiType === 'I') {
      return `    <cfdi:Concepto
      ClaveProdServ="78101800"
      Cantidad="1"
      ClaveUnidad="E48"
      Unidad="Servicio"
      Descripcion="Servicio de transporte terrestre de carga"
      ValorUnitario="${this.money(input.subtotal)}"
      Importe="${this.money(input.subtotal)}"
      ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado
            Base="${this.money(input.subtotal)}"
            Impuesto="002"
            TipoFactor="Tasa"
            TasaOCuota="0.160000"
            Importe="${this.money(input.iva)}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>`;
    }
    // Para tipo Traslado, los conceptos son las mercancías a granel
    return input.merchandise.map(m => `    <cfdi:Concepto
      ClaveProdServ="${m.productServiceCode}"
      Cantidad="${m.quantity}"
      ClaveUnidad="${m.unitCode}"
      Descripcion="${this.esc(m.description)}"
      ValorUnitario="0"
      Importe="0"
      ObjetoImp="01"/>`).join('\n');
  }

  private renderImpuestos(iva: number): string {
    return `  <cfdi:Impuestos TotalImpuestosTrasladados="${this.money(iva)}">
    <cfdi:Traslados>
      <cfdi:Traslado
        Base="${this.money(iva / 0.16)}"
        Impuesto="002"
        TipoFactor="Tasa"
        TasaOCuota="0.160000"
        Importe="${this.money(iva)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>`;
  }

  /** Escape XML básico. */
  esc(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  money(n: number): string {
    if (n === 0) return '0';
    return n.toFixed(2);
  }
}
