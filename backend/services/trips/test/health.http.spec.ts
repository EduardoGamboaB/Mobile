import type { INestApplication } from '@nestjs/common';
import { createTripsApp } from '../src/main';

describe('trips HTTP: /health y /ready', () => {
  let app: INestApplication;
  let base: string;
  let dbUp = true;

  beforeAll(async () => {
    app = await createTripsApp({
      logger: false,
      readiness: [
        {
          name: 'db',
          check: async () => {
            if (!dbUp) throw new Error('db caída');
          },
        },
      ],
    });
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
  });
  afterAll(async () => {
    await app.close();
  });

  test('/health responde sin tocar dependencias; /ready refleja la base', async () => {
    expect((await fetch(`${base}/health`)).status).toBe(200);
    expect((await fetch(`${base}/ready`)).status).toBe(200);
    dbUp = false;
    const r = await fetch(`${base}/ready`);
    expect(r.status).toBe(503);
    expect(await r.json()).toMatchObject({ ok: false, checks: { db: 'db caída' } });
  });
});
