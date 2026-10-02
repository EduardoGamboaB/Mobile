/**
 * Adaptadores de PACs reales. Validan la configuración capturada en G3
 * Admin (catálogo `pac` de @g3/contracts) desde ya; el cliente HTTP de
 * timbrado/cancelación se implementa cuando tengamos el contrato y las
 * credenciales sandbox de cada PAC (ver docs/carta-porte-3.0/pac-comparison.md).
 */
import { validateIntegrationSettings } from '@g3/contracts';
import type { CancelRequest, CancelResult, PacProvider, StampRequest, StampResult } from './pac.provider';

export interface PacCredentials {
  environment: 'sandbox' | 'production';
  rfc: string;
  user: string;
  password: string;
}

export class PacConfigError extends Error {
  constructor(provider: string, readonly fields: Record<string, string>) {
    super(`Configuración de ${provider} inválida: ${Object.entries(fields).map(([k, v]) => `${k} (${v})`).join(', ')}`);
    this.name = 'PacConfigError';
  }
}

export const PAC_PENDING_MESSAGE = 'adaptador HTTP pendiente de credenciales sandbox';

abstract class PendingHttpPacProvider implements PacProvider {
  abstract readonly name: string;
  protected abstract readonly label: string;

  constructor(readonly credentials: PacCredentials) {}

  protected validate() {
    const { password, ...settings } = this.credentials;
    const errors = validateIntegrationSettings('pac', this.name, { ...settings, password });
    if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(this.credentials.rfc?.toUpperCase() ?? '')) errors.rfc = errors.rfc ?? 'RFC inválido';
    if (Object.keys(errors).length > 0) throw new PacConfigError(this.label, errors);
  }

  get environment() {
    return this.credentials.environment;
  }

  async stamp(_req: StampRequest): Promise<StampResult> {
    throw new Error(`${this.label}: ${PAC_PENDING_MESSAGE}`);
  }

  async cancel(_req: CancelRequest): Promise<CancelResult> {
    throw new Error(`${this.label}: ${PAC_PENDING_MESSAGE}`);
  }

  async healthCheck(): Promise<boolean> {
    return false;
  }
}

export class DiverzaPacProvider extends PendingHttpPacProvider {
  readonly name = 'diverza';
  protected readonly label = 'Diverza';
  constructor(credentials: PacCredentials) {
    super(credentials);
    this.validate();
  }
}

export class FacturamaPacProvider extends PendingHttpPacProvider {
  readonly name = 'facturama';
  protected readonly label = 'Facturama';
  constructor(credentials: PacCredentials) {
    super(credentials);
    this.validate();
  }
}
