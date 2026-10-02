import type { CancelRequest, CancelResult, PacProvider, StampRequest, StampResult } from './pac.provider';

/**
 * Multi-PAC: timbra con el primario y, si falla por su lado (excepción,
 * timeout o `isOurError`), reintenta con el de respaldo. Un rechazo del
 * SAT (`isOurError: false`) NO se reintenta: el XML está mal y el otro PAC
 * lo rechazaría igual.
 */
export class HighAvailabilityPacProvider implements PacProvider {
  readonly name: string;

  constructor(readonly primary: PacProvider, readonly backup: PacProvider) {
    this.name = `${primary.name}+${backup.name}`;
  }

  async stamp(req: StampRequest): Promise<StampResult> {
    let primaryError: Error | null = null;
    try {
      const r = await this.primary.stamp(req);
      if (r.ok || !r.isOurError) return r;
    } catch (e) {
      primaryError = e as Error;
    }
    try {
      return await this.backup.stamp(req);
    } catch (e) {
      throw new Error(
        `Timbrado falló en ambos PACs — ${this.primary.name}: ${primaryError?.message ?? 'error del PAC'}; ${this.backup.name}: ${(e as Error).message}`,
      );
    }
  }

  /** La cancelación va al PAC que timbró; si no responde, se intenta con el otro. */
  async cancel(req: CancelRequest): Promise<CancelResult> {
    try {
      const r = await this.primary.cancel(req);
      if (r.ok) return r;
    } catch {
      // cae al respaldo
    }
    return this.backup.cancel(req);
  }

  async healthCheck(): Promise<boolean> {
    const [a, b] = await Promise.all([
      this.primary.healthCheck().catch(() => false),
      this.backup.healthCheck().catch(() => false),
    ]);
    return a || b;
  }
}
