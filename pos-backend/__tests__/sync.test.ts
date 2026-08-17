import request from 'supertest';
import { createApp } from '../src/app';

const API_KEY = 'test-key';
const auth = { Authorization: `Bearer ${API_KEY}` };

describe('g3-pos-backend', () => {
  const { app } = createApp({ apiKey: API_KEY });

  it('GET /health responde sin autenticación', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rechaza peticiones sin API key', async () => {
    const res = await request(app).post('/products').send({ op: 'upsert', entityId: 'x', payload: {} });
    expect(res.status).toBe(401);
  });

  it('rechaza entidades desconocidas', async () => {
    const res = await request(app).post('/hackers').set(auth).send({ op: 'upsert', entityId: 'x', payload: {} });
    expect(res.status).toBe(404);
  });

  it('upsert guarda y actualiza un producto (contrato del outbox móvil)', async () => {
    const body = {
      op: 'upsert',
      entityId: 'p1',
      payload: { id: 'p1', name: 'Refresco 600ml', price: 1800 },
      queuedAt: '2026-01-01T00:00:00.000Z',
    };
    expect((await request(app).post('/products').set(auth).send(body)).status).toBe(200);

    const updated = { ...body, payload: { ...body.payload, price: 1900 } };
    expect((await request(app).post('/products').set(auth).send(updated)).status).toBe(200);

    const list = await request(app).get('/products').set(auth);
    expect(list.status).toBe(200);
    expect(list.body.records).toHaveLength(1);
    expect(list.body.records[0].payload.price).toBe(1900);
    expect(list.body.records[0].deleted).toBe(false);
  });

  it('delete marca el registro como eliminado (soft delete para pull)', async () => {
    await request(app).post('/customers').set(auth).send({
      op: 'upsert',
      entityId: 'c1',
      payload: { id: 'c1', name: 'Cliente' },
    });
    await request(app).post('/customers').set(auth).send({ op: 'delete', entityId: 'c1' });

    const list = await request(app).get('/customers').set(auth);
    expect(list.body.records).toHaveLength(1);
    expect(list.body.records[0].deleted).toBe(true);
  });

  it('pull incremental con since devuelve solo lo nuevo', async () => {
    await request(app).post('/sales').set(auth).send({
      op: 'upsert',
      entityId: 's1',
      payload: { id: 's1', folio: 1, total: 11600, items: [] },
    });
    const first = await request(app).get('/sales').set(auth);
    const cursor = first.body.nextSince;

    const empty = await request(app).get('/sales').set(auth).query({ since: cursor });
    expect(empty.body.records).toHaveLength(0);

    await request(app).post('/sales').set(auth).send({
      op: 'upsert',
      entityId: 's2',
      payload: { id: 's2', folio: 2, total: 5000, items: [] },
    });
    const delta = await request(app).get('/sales').set(auth).query({ since: cursor });
    expect(delta.body.records).toHaveLength(1);
    expect(delta.body.records[0].id).toBe('s2');
  });

  it('valida op y entityId', async () => {
    expect((await request(app).post('/products').set(auth).send({ op: 'boom', entityId: 'x' })).status).toBe(400);
    expect((await request(app).post('/products').set(auth).send({ op: 'upsert' })).status).toBe(400);
    expect(
      (await request(app).post('/products').set(auth).send({ op: 'upsert', entityId: 'x' })).status,
    ).toBe(400);
  });

  it('stats cuenta registros vivos por entidad', async () => {
    const res = await request(app).get('/stats').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.counts.products).toBe(1);
    expect(res.body.counts.customers).toBe(0); // c1 fue eliminado
    expect(res.body.counts.sales).toBe(2);
  });
});
