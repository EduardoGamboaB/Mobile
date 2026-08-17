import express, { type NextFunction, type Request, type Response } from 'express';
import { SyncStore, isEntity } from './db';

export interface AppOptions {
  dbPath?: string;
  apiKey?: string;
}

/**
 * API de sincronización del POS Móvil.
 *
 * Contrato (el que la app usa en Configuración → Sincronización):
 *   POST /:entity            { op: 'upsert'|'delete', entityId, payload, queuedAt }
 *   GET  /:entity?since=ISO  pull incremental (registros recibidos después de `since`)
 *   GET  /health             estado del servicio
 *   GET  /stats              conteo de registros por entidad
 *
 * Autenticación: si API_KEY está definida, todas las rutas (salvo /health)
 * exigen `Authorization: Bearer <API_KEY>`.
 */
export const createApp = (options: AppOptions = {}) => {
  const store = new SyncStore(options.dbPath ?? ':memory:');
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!options.apiKey) return next();
    const header = req.headers.authorization ?? '';
    if (header === `Bearer ${options.apiKey}`) return next();
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  };

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'g3-pos-backend', time: new Date().toISOString() });
  });

  app.get('/stats', requireAuth, (_req, res) => {
    res.json({ ok: true, counts: store.stats() });
  });

  app.get('/:entity', requireAuth, (req, res) => {
    const { entity } = req.params;
    if (!isEntity(entity)) {
      return res.status(404).json({ ok: false, error: `entidad desconocida: ${entity}` });
    }
    const since = typeof req.query.since === 'string' ? req.query.since : '';
    const limit = Math.min(parseInt(String(req.query.limit ?? '500'), 10) || 500, 1000);
    const records = store.list(entity, since, limit).map((r) => ({
      id: r.id,
      deleted: r.deleted === 1,
      receivedAt: r.receivedAt,
      payload: JSON.parse(r.payload),
    }));
    return res.json({ ok: true, records, nextSince: records.at(-1)?.receivedAt ?? since });
  });

  app.post('/:entity', requireAuth, (req, res) => {
    const { entity } = req.params;
    if (!isEntity(entity)) {
      return res.status(404).json({ ok: false, error: `entidad desconocida: ${entity}` });
    }
    const { op, entityId, payload, queuedAt } = req.body ?? {};
    if (typeof entityId !== 'string' || !entityId) {
      return res.status(400).json({ ok: false, error: 'entityId requerido' });
    }
    if (op === 'upsert') {
      if (payload == null || typeof payload !== 'object') {
        return res.status(400).json({ ok: false, error: 'payload requerido para upsert' });
      }
      store.upsert(entity, entityId, payload, typeof queuedAt === 'string' ? queuedAt : '');
      return res.json({ ok: true });
    }
    if (op === 'delete') {
      store.markDeleted(entity, entityId, typeof queuedAt === 'string' ? queuedAt : '');
      return res.json({ ok: true });
    }
    return res.status(400).json({ ok: false, error: `op inválida: ${String(op)}` });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(400).json({ ok: false, error: err.message });
  });

  return { app, store };
};
