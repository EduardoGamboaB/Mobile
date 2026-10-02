import type { ResolvedIntegrationDto } from '@g3/contracts';
import type { IntegrationResolver } from '@g3/integrations';
import type { PacProvider } from './pac.provider';
import { MockPacProvider } from './mock.provider';
import { DiverzaPacProvider, FacturamaPacProvider, type PacCredentials } from './http-pac.providers';
import { HighAvailabilityPacProvider } from './high-availability.provider';

/** Adaptador para una ranura resuelta; `null` si la ranura no tiene PAC. */
export function pacFromResolved(r: ResolvedIntegrationDto): PacProvider | null {
  if (r.source === 'none' || !r.provider) return null;
  const s = (k: string) => (typeof r.settings[k] === 'string' ? (r.settings[k] as string) : '');
  const creds: PacCredentials = {
    environment: s('environment') === 'production' ? 'production' : 'sandbox',
    rfc: s('rfc'),
    user: s('user'),
    password: r.secrets.password ?? '',
  };
  switch (r.provider) {
    case 'diverza':
      return new DiverzaPacProvider(creds);
    case 'facturama':
      return new FacturamaPacProvider(creds);
    default:
      throw new Error(`PAC no soportado: ${r.provider}`);
  }
}

export interface BuildPacOptions {
  /** Sin ninguna ranura configurada (dev/tests). Default: MockPacProvider. */
  fallback?: () => PacProvider;
}

/**
 * Arma el PAC de la compañía desde las ranuras `primary` y `backup` del
 * servicio integrations (compañía → plataforma):
 *  - ambas → HighAvailabilityPacProvider (failover)
 *  - una sola → ese PAC
 *  - ninguna → Mock (no timbra de verdad)
 */
export async function buildPacProvider(
  companyId: string,
  resolver: IntegrationResolver,
  opts: BuildPacOptions = {},
): Promise<PacProvider> {
  const [primary, backup] = await Promise.all([
    resolver.resolve(companyId, 'pac', 'primary'),
    resolver.resolve(companyId, 'pac', 'backup'),
  ]);
  const p = pacFromResolved(primary);
  const b = pacFromResolved(backup);
  if (p && b) return new HighAvailabilityPacProvider(p, b);
  if (p || b) return (p ?? b)!;
  return opts.fallback ? opts.fallback() : new MockPacProvider();
}
