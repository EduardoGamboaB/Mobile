/**
 * Bitácora de auditoría append-only con hash encadenado por compañía.
 *
 *   hash_n = sha256(prevHash_n + JSON canónico(entrada_n sin `hash`))
 *   prevHash_n = hash_{n-1}   (génesis = '0' * 64)
 *
 * Editar, borrar, reordenar o truncar entradas rompe la cadena y lo detecta
 * `verify()`. NO impide que un atacante con acceso total reescriba TODA la
 * cadena — para eso el `head` se ancla fuera de la DB (ver audit.repo.ts).
 */
import { createHash, randomUUID } from 'crypto';
import type {
  AuditAction,
  AuditActorDto,
  AuditEntryDto,
  AuditIntegrityDto,
  AuditPageDto,
  AuditQueryDto,
} from '@g3/contracts';
import type { Clock } from '../clock';
import { GLOBAL_CHAIN, type AuditRepo } from './audit.repo';

export const GENESIS_HASH = '0'.repeat(64);
const MAX_PAGE_SIZE = 200;
const SENSITIVE_KEY = /pass(word)?|secret|token|^code$|otp|recovery/i;

export interface AuditRecordInput {
  companyId: string | null;
  actor: AuditActorDto;
  action: AuditAction;
  resource: { type: string; id: string | null };
  ip: string | null;
  userAgent: string | null;
  metadata?: Record<string, unknown>;
}

/** Serialización determinista: llaves ordenadas en todos los niveles. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
    .join(',')}}`;
}

function redact(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE_KEY.test(k)) out[k] = '[REDACTED]';
    else if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = redact(v as Record<string, unknown>);
    else out[k] = v;
  }
  return out;
}

export class AuditService {
  /** Serializa appends por cadena para que dos escrituras no tomen el mismo prevHash. */
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(private readonly repo: AuditRepo, private readonly clock: Clock) {}

  static computeHash(entry: Omit<AuditEntryDto, 'hash'> & { hash?: string }): string {
    const { hash: _ignored, ...rest } = entry;
    return createHash('sha256').update(entry.prevHash).update(canonicalJson(rest)).digest('hex');
  }

  async record(input: AuditRecordInput): Promise<AuditEntryDto> {
    const key = input.companyId ?? GLOBAL_CHAIN;
    const prev = this.locks.get(key) ?? Promise.resolve();
    const run = prev.then(() => this.appendUnlocked(key, input));
    this.locks.set(key, run.catch(() => undefined));
    return run;
  }

  private async appendUnlocked(key: string, input: AuditRecordInput): Promise<AuditEntryDto> {
    const head = await this.repo.head(key);
    const base: Omit<AuditEntryDto, 'hash'> = {
      id: randomUUID(),
      seq: (head?.seq ?? 0) + 1,
      companyId: input.companyId,
      actor: { ...input.actor },
      action: input.action,
      resource: { ...input.resource },
      ip: input.ip,
      userAgent: input.userAgent ? input.userAgent.slice(0, 512) : null,
      timestamp: new Date(this.clock.now()).toISOString(),
      metadata: redact(input.metadata ?? {}),
      prevHash: head?.hash ?? GENESIS_HASH,
    };
    const entry: AuditEntryDto = { ...base, hash: AuditService.computeHash(base) };
    await this.repo.append(key, entry);
    return structuredClone(entry);
  }

  async query(companyId: string, q: AuditQueryDto): Promise<AuditPageDto> {
    const page = Math.max(1, Math.floor(Number(q.page) || 1));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(q.pageSize) || 50)));
    const fromMs = q.from ? Date.parse(q.from) : null;
    const toMs = q.to ? Date.parse(q.to) : null;
    const all = (await this.repo.list(companyId))
      .filter((e) => !q.action || e.action === q.action)
      .filter((e) => !q.actorId || e.actor.userId === q.actorId)
      .filter((e) => !q.resourceType || e.resource.type === q.resourceType)
      .filter((e) => fromMs == null || Number.isNaN(fromMs) || Date.parse(e.timestamp) >= fromMs)
      .filter((e) => toMs == null || Number.isNaN(toMs) || Date.parse(e.timestamp) <= toMs)
      .reverse();
    const start = (page - 1) * pageSize;
    return { items: all.slice(start, start + pageSize), page, pageSize, total: all.length };
  }

  async verify(companyId: string): Promise<AuditIntegrityDto> {
    const entries = await this.repo.list(companyId);
    let prevHash = GENESIS_HASH;
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const broken = (reason: string): AuditIntegrityDto => ({
        ok: false,
        entries: entries.length,
        brokenAtSeq: e.seq,
        reason,
      });
      if (e.seq !== i + 1) return broken('Secuencia discontinua (entrada borrada o reordenada)');
      if (e.prevHash !== prevHash) return broken('prevHash no coincide con la entrada anterior');
      if (AuditService.computeHash(e) !== e.hash) return broken('Hash de la entrada no coincide (contenido alterado)');
      prevHash = e.hash;
    }
    const head = await this.repo.head(companyId);
    const last = entries[entries.length - 1];
    if (head && (!last || head.seq !== last.seq || head.hash !== last.hash)) {
      return {
        ok: false,
        entries: entries.length,
        brokenAtSeq: (last?.seq ?? 0) + 1,
        reason: 'Cadena truncada: el ancla (head) no coincide con la última entrada',
      };
    }
    return { ok: true, entries: entries.length, brokenAtSeq: null, reason: null };
  }
}
