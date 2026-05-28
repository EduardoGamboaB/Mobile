import type { CFDIGenerator } from '../cfdi/generator';
import type {
  CartaPorteInput, Location, Merchandise, Operator, Trailer
} from './types';

/**
 * Genera el XML completo CFDI 4.0 + Complemento Carta Porte 3.0
 * Implementación apegada al Anexo 20 RMF 2024.
 *
 * No sella ni timbra — eso lo hace el PAC. Este generador
 * produce el XML que entra como input al PAC.
 */
export class CartaPorteGenerator {
  constructor(private readonly cfdi: CFDIGenerator) {}

  generate(input: CartaPorteInput): string {
    this.validate(input);

    const header = this.cfdi.renderHeader(input);
    const complemento = this.renderComplemento(input);
    const footer = this.cfdi.renderFooter();

    return `${header}
  <cfdi:Complemento>
${complemento}
  </cfdi:Complemento>${footer}`;
  }

  // ─── Validaciones de negocio ────────────────────────
  private validate(i: CartaPorteInput): void {
    if (i.locations.length < 2) {
      throw new Error('Carta porte requiere al menos origen y destino');
    }
    if (i.locations[0].type !== 'Origen') {
      throw new Error('La primera ubicación debe ser de tipo Origen');
    }
    if (i.locations[i.locations.length - 1].type !== 'Destino') {
      throw new Error('La última ubicación debe ser de tipo Destino');
    }
    if (i.merchandise.length === 0) {
      throw new Error('Carta porte requiere al menos una mercancía');
    }
    if (i.operators.length === 0) {
      throw new Error('Se requiere asignar al menos un operador');
    }
    if (!i.autotransport.plateVm) {
      throw new Error('La placa del tracto es obligatoria');
    }
    for (const m of i.merchandise) {
      if (m.weightKg < 0) {
        throw new Error('Peso de mercancía no puede ser negativo');
      }
      if (m.isDangerous && !m.unCode) {
        throw new Error('Mercancía peligrosa requiere código UN (c_MaterialPeligroso)');
      }
    }
    const sumDistance = i.locations
      .slice(1) // origen no cuenta
      .reduce((sum, l) => sum + l.distanceToNextKm, 0);
    if (i.totalDistanceKm < sumDistance) {
      throw new Error(
        `Distancia total (${i.totalDistanceKm}) menor a suma de tramos (${sumDistance})`,
      );
    }
    if (i.transportInternational && (!i.entranceExit || !i.country)) {
      throw new Error('Transporte internacional requiere EntradaSalidaMerc y PaisOrigenDestino');
    }
  }

  // ─── Render del complemento ─────────────────────────
  private renderComplemento(i: CartaPorteInput): string {
    const totalKg = i.merchandise.reduce((s, m) => s + m.weightKg, 0);
    const numMerc = i.merchandise.length;

    const internacAttr = i.transportInternational
      ? `TranspInternac="Sí"
      EntradaSalidaMerc="${i.entranceExit}"
      PaisOrigenDestino="${i.country}"`
      : 'TranspInternac="No"';

    const idCCP = i.idCCP ?? this.makeIdCCP();

    return `    <cartaporte30:CartaPorte
      Version="3.0"
      IdCCP="${idCCP}"
      ${internacAttr}
      TotalDistRec="${this.num(i.totalDistanceKm)}">
${this.renderUbicaciones(i.locations)}
${this.renderMercancias(i, totalKg, numMerc)}
${this.renderFiguraTransporte(i.operators)}
    </cartaporte30:CartaPorte>`;
  }

  private renderUbicaciones(locs: Location[]): string {
    const lines: string[] = ['      <cartaporte30:Ubicaciones>'];
    let originSeq = 1, destSeq = 1;

    for (const l of locs) {
      const id = l.type === 'Origen'
        ? `OR${String(originSeq++).padStart(6, '0')}`
        : `DE${String(destSeq++).padStart(6, '0')}`;

      const dateAttr = l.type === 'Origen'
        ? `FechaHoraSalida="${l.scheduledDate}"`
        : `FechaHoraProgLlegada="${l.scheduledDate}"`;

      const distAttr = l.type === 'Destino' && l.distanceToNextKm > 0
        ? `DistanciaRecorrida="${this.num(l.distanceToNextKm)}"`
        : '';

      lines.push(`        <cartaporte30:Ubicacion
          TipoUbicacion="${l.type}"
          IDUbicacion="${id}"
          ${l.rfc ? `RFCRemitenteDestinatario="${l.rfc}"` : ''}
          ${l.name ? `NombreRemitenteDestinatario="${this.esc(l.name)}"` : ''}
          ${dateAttr}
          ${distAttr}>
          <cartaporte30:Domicilio
            Estado="${l.state}"
            CodigoPostal="${l.zip}"
            Pais="MEX"/>
        </cartaporte30:Ubicacion>`);
    }
    lines.push('      </cartaporte30:Ubicaciones>');
    return lines.join('\n');
  }

  private renderMercancias(i: CartaPorteInput, totalKg: number, numMerc: number): string {
    const merch = i.merchandise.map(m => this.renderMercancia(m)).join('\n');
    const transport = this.renderAutotransporte(i.autotransport);
    return `      <cartaporte30:Mercancias
        PesoBrutoTotal="${this.num(totalKg)}"
        UnidadPeso="KGM"
        NumTotalMercancias="${numMerc}">
${merch}
${transport}
      </cartaporte30:Mercancias>`;
  }

  private renderMercancia(m: Merchandise): string {
    const dangerousAttrs = m.isDangerous
      ? `MaterialPeligroso="Sí"
            CveMaterialPeligroso="${m.unCode}"
            ${m.packingCode ? `Embalaje="${m.packingCode}"` : ''}`
      : 'MaterialPeligroso="No"';
    const tariffAttr = m.tariffCode ? `FraccionArancelaria="${m.tariffCode}"` : '';

    return `        <cartaporte30:Mercancia
          BienesTransp="${m.productServiceCode}"
          Descripcion="${this.esc(m.description)}"
          Cantidad="${this.num(m.quantity)}"
          ClaveUnidad="${m.unitCode}"
          PesoEnKg="${this.num(m.weightKg)}"
          ValorMercancia="${this.num(m.valueAmount)}"
          Moneda="${m.valueCurrency ?? 'MXN'}"
          ${dangerousAttrs}
          ${tariffAttr}/>`;
  }

  private renderAutotransporte(a: CartaPorteInput['autotransport']): string {
    const trailers = a.trailers.length > 0
      ? `\n          <cartaporte30:Remolques>
${a.trailers.map(t => this.renderTrailer(t)).join('\n')}
          </cartaporte30:Remolques>`
      : '';

    const cargoIns = a.insuranceCargoCompany
      ? `\n            AseguraCarga="${this.esc(a.insuranceCargoCompany)}"
            PolizaCarga="${a.insuranceCargoPolicy}"
            PrimaSeguro="${this.num(a.insuranceCargoAmount ?? 0)}"`
      : '';

    return `        <cartaporte30:Autotransporte
          PermSCT="${a.permSct}"
          NumPermisoSCT="${a.permNumber}">
          <cartaporte30:IdentificacionVehicular
            ConfigVehicular="${a.config}"
            PlacaVM="${a.plateVm}"
            AnioModeloVM="${a.vehicleYear}"/>
          <cartaporte30:Seguros
            AseguraRespCivil="${this.esc(a.insuranceCivilCompany)}"
            PolizaRespCivil="${a.insuranceCivilPolicy}"${cargoIns}/>${trailers}
        </cartaporte30:Autotransporte>`;
  }

  private renderTrailer(t: Trailer): string {
    return `            <cartaporte30:Remolque
              SubTipoRem="${t.subtype}"
              Placa="${t.plate}"/>`;
  }

  private renderFiguraTransporte(ops: Operator[]): string {
    const figs = ops.map(o => `        <cartaporte30:TiposFigura
          TipoFigura="${o.typeFigura}"
          RFCFigura="${o.rfc}"
          NumLicencia="${o.federalLicenseNumber}"
          NombreFigura="${this.esc(o.name)}"/>`).join('\n');
    return `      <cartaporte30:FiguraTransporte>
${figs}
      </cartaporte30:FiguraTransporte>`;
  }

  // ─── Helpers ─────────────────────────────────────────
  private makeIdCCP(): string {
    // IdCCP debe iniciar con 'CCC' + UUID v4 (36 chars incl. dashes)
    const uuid = '00000000-0000-0000-0000-000000000000'.replace(/0/g, () =>
      Math.floor(Math.random() * 16).toString(16),
    );
    return `CCC${uuid}`;
  }

  private esc(s: string): string {
    return this.cfdi.esc(s);
  }

  private num(n: number): string {
    return n === 0 ? '0' : n.toString();
  }
}
