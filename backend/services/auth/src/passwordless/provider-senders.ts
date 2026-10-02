/**
 * SMS y correo de passwordless con el proveedor configurado para la
 * compañía del destinatario (servicio integrations: compañía → plataforma
 * → entorno; sin nada, modo registro que no envía).
 *
 * Un fallo del proveedor NO se propaga: `requestOtp`/`requestPasswordReset`
 * siempre responden "aceptado" (no revelan si el teléfono/correo existe).
 * Se registra un aviso sin destinatario completo ni secretos.
 */
import {
  buildEmailSender,
  buildSmsSender,
  type FetchLike,
  type IntegrationResolver,
} from '@g3/integrations';
import type { EmailSender, SmsSender } from './passwordless.service';

export interface ProviderSenderOptions {
  fetch?: FetchLike;
  log?: (msg: string) => void;
}

const defaultLog = (m: string) => console.warn(m);

export class ProviderSmsSender implements SmsSender {
  constructor(private readonly resolver: IntegrationResolver, private readonly opts: ProviderSenderOptions = {}) {}

  async send(companyId: string, to: string, body: string): Promise<void> {
    const log = this.opts.log ?? defaultLog;
    try {
      const resolved = await this.resolver.resolve(companyId, 'sms');
      const sender = buildSmsSender(resolved, { fetch: this.opts.fetch, log });
      const r = await sender.send(to, body);
      if (!r.ok) log(`[auth] SMS no enviado (compañía ${companyId}, ${sender.provider}, …${to.slice(-4)}): ${r.error}${r.detail ? ` · ${r.detail}` : ''}`);
    } catch (e) {
      log(`[auth] SMS no enviado (compañía ${companyId}): ${(e as Error).message}`);
    }
  }
}

export class ProviderEmailSender implements EmailSender {
  constructor(private readonly resolver: IntegrationResolver, private readonly opts: ProviderSenderOptions = {}) {}

  async send(companyId: string, to: string, subject: string, body: string): Promise<void> {
    const log = this.opts.log ?? defaultLog;
    try {
      const resolved = await this.resolver.resolve(companyId, 'email');
      const sender = buildEmailSender(resolved, { fetch: this.opts.fetch, log });
      const r = await sender.send({ to, subject, text: body });
      if (!r.ok) log(`[auth] correo no enviado (compañía ${companyId}, ${sender.provider}): ${r.error}${r.detail ? ` · ${r.detail}` : ''}`);
    } catch (e) {
      log(`[auth] correo no enviado (compañía ${companyId}): ${(e as Error).message}`);
    }
  }
}
