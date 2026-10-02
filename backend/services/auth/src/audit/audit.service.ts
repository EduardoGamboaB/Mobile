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
import { GENESIS_HASH, GLOBAL_CHAIN, type AuditHead, type AuditRepo } from './audit.repo';

export { GENESIS_HASH } from './audit.repo';
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

/** Postgres no admite U+0000 en text/jsonb: se quita antes de calcular el hash. */
const NUL = /\u0000/g;
function clean<T>(v: T): T {
  if (typeof v === 'string') return v.replace(NUL, '') as T;
  if (Array.isArray(v)) return v.map(clean) as T;
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k.replace(NUL, '')] = clean(x);
    return out as T;
  }
  return v;
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
  constructor(private readonly repo: AuditRepo, private readonly clock: Clock) {}

  static computeHash(entry: Omit<AuditEntryDto, 'hash'> & { hash?: string }): string {
    const { hash: _ignored, ...rest } = entry;
    return createHash('sha256').update(entry.prevHash).update(canonicalJson(rest)).digest('hex');
  }

  /**
   * Anexa a la cadena de la compañía. La atomicidad (que dos escrituras no
   * tomen la misma cabeza, aun desde réplicas distintas) la garantiza el repo:
   * en Postgres con `SELECT … FOR UPDATE` sobre la fila cabeza.
   */
  async record(input: AuditRecordInput): Promise<AuditEntryDto> {
    const key = input.companyId ?? GLOBAL_CHAIN;
    const fields = clean({
      companyId: input.companyId,
      actor: { ...input.actor },
      action: input.action,
      resource: { ...input.resource },
      ip: input.ip ? input.ip.slice(0, 64) : null,
      userAgent: input.userAgent ? input.userAgent.slice(0, 512) : null,
      metadata: redact(input.metadata ?? {}),
    });
    const timestamp = new Date(this.clock.now()).toISOString();
    const entry = await this.repo.appendNext(key, (head: AuditHead | null) => {
      const base: Omit<AuditEntryDto, 'hash'> = {
        id: randomUUID(),
        seq: (head?.seq ?? 0) + 1,
        companyId: fields.companyId,
        actor: fields.actor,
        action: fields.action,
        resource: fields.resource,
        ip: fields.ip,
        userAgent: fields.userAgent,
        timestamp,
        metadata: fields.metadata,
        prevHash: head?.hash ?? GENESIS_HASH,
      };
      return { ...base, hash: AuditService.computeHash(base) };
    });
    return structuredClone(entry);
  }

  async query(companyId: string, q: AuditQueryDto): Promise<AuditPageDto> {
    const page = Math.max(1, Math.floor(Number(q.page) || 1));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(q.pageSize) || 50)));
    const ms = (v?: string) => {
      if (!v) return null;
      const n = Date.parse(v);
      return Number.isNaN(n) ? null : n;
    };
    const { items, total } = await this.repo.search(
      companyId,
      {
        action: q.action || undefined,
        actorId: q.actorId || undefined,
        resourceType: q.resourceType || undefined,
        fromMs: ms(q.from),
        toMs: ms(q.to),
      },
      (page - 1) * pageSize,
      pageSize,
    );
    return { items, page, pageSize, total };
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
