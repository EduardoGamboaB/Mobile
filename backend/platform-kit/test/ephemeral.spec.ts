import Redis from 'ioredis';
import { MemoryEphemeralStore, RedisEphemeralStore, type EphemeralStore } from '../src';
import { describeIfRedis } from '../src/testing';

function contract(name: string, make: () => { store: EphemeralStore; advance: (ms: number) => Promise<void> }) {
  describe(name, () => {
    let s: ReturnType<typeof make>;
    beforeEach(() => {
      s = make();
    });
    afterEach(async () => s.store.close());

    test('set/get con TTL', async () => {
      await s.store.set('a', '1', 50);
      expect(await s.store.get('a')).toBe('1');
      await s.advance(80);
      expect(await s.store.get('a')).toBeNull();
    });

    test('setIfAbsent solo escribe una vez (anti-replay)', async () => {
      expect(await s.store.setIfAbsent('jti', 'x', 1000)).toBe(true);
      expect(await s.store.setIfAbsent('jti', 'y', 1000)).toBe(false);
      expect(await s.store.get('jti')).toBe('x');
    });

    test('take lee y borra (un solo uso)', async () => {
      await s.store.set('tok', 'v', 1000);
      expect(await s.store.take('tok')).toBe('v');
      expect(await s.store.take('tok')).toBeNull();
    });

    test('incr cuenta dentro de la ventana fija', async () => {
      expect(await s.store.incr('n', 1000)).toBe(1);
      expect(await s.store.incr('n', 1000)).toBe(2);
      await s.store.del('n');
      expect(await s.store.incr('n', 1000)).toBe(1);
    });

    test('slidingHit cuenta eventos en la ventana', async () => {
      const t0 = 1_000_000;
      expect((await s.store.slidingHit('rl', t0, 1000)).count).toBe(1);
      expect((await s.store.slidingHit('rl', t0 + 10, 1000)).count).toBe(2);
      const r = await s.store.slidingHit('rl', t0 + 1500, 1000);
      expect(r.count).toBe(1);
      expect(r.oldest).toBe(t0 + 1500);
    });
  });
}

let clock = Date.now();
contract('MemoryEphemeralStore', () => {
  clock = Date.now();
  const store = new MemoryEphemeralStore(() => clock);
  return { store, advance: async (ms) => { clock += ms; } };
});

describeIfRedis('Redis real', () => {
  contract('RedisEphemeralStore', () => {
    const store = new RedisEphemeralStore(new Redis(process.env.TEST_REDIS_URL!), `g3:test:${process.pid}:${Math.random()}`);
    return { store, advance: (ms) => new Promise((r) => setTimeout(r, ms)) };
  });
});
