import 'reflect-metadata';
import { Module, NestMiddleware, Inject } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { tierHas, UpgradeRequiredError, type FeatureValue } from '@g3/contracts';
import { extractContext } from './middleware/jwt-context';
import { matchGate } from './middleware/tier-gate';
import { resolveUpstream, type ServiceUrls } from './proxy/router';

const env = (k: string, fallback?: string): string => process.env[k] ?? fallback ?? '';

const SERVICE_URLS: ServiceUrls = {
  auth: env('AUTH_URL', 'http://localhost:8081'),
  billing: env('BILLING_URL', 'http://localhost:8082'),
  drivers: env('DRIVERS_URL', 'http://localhost:8083'),
  fleet: env('FLEET_URL', 'http://localhost:8084'),
  trips: env('TRIPS_URL', 'http://localhost:8085'),
  alerts: env('ALERTS_URL', 'http://localhost:8086'),
  ai: env('AI_URL', 'http://localhost:8087'),
};

const JWT_SECRET = env('JWT_ACCESS_SECRET', 'a'.repeat(32));

/** Rutas que NO requieren JWT (públicas). */
const PUBLIC_PATHS = [/^\/api\/auth\/(login|register-company|refresh)$/, /^\/api\/webhooks\/stripe$/, /^\/health$/];

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.some((r) => r.test(path));
}

async function proxy(upstream: string, req: Request, res: Response, ctx?: { companyId: string; tier: string; userId: string; role: string }) {
  const url = `${upstream}${req.originalUrl}`;
  const headers: Record<string, string> = { 'content-type': req.header('content-type') ?? 'application/json' };
  if (ctx) {
    headers['x-company-id'] = ctx.companyId;
    headers['x-tier'] = ctx.tier;
    headers['x-user-id'] = ctx.userId;
    headers['x-user-role'] = ctx.role;
  }
  const init: RequestInit = {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
  };
  const r = await fetch(url, init);
  res.status(r.status);
  const ct = r.headers.get('content-type');
  if (ct) res.setHeader('content-type', ct);
  const text = await r.text();
  res.send(text);
}

@Module({})
class GatewayModule {}

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule, { cors: true, bodyParser: true });
  const http = app.getHttpAdapter().getInstance() as import('express').Express;

  http.get('/health', (_req, res) => res.json({ ok: true, services: Object.keys(SERVICE_URLS) }));

  http.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const target = resolveUpstream(req.path, SERVICE_URLS);
      if (!target) return next();

      let ctx: ReturnType<typeof extractContext> | undefined;
      if (!isPublic(req.path)) {
        ctx = extractContext(req.header('authorization'), JWT_SECRET);

        const gate = matchGate(req.method, req.path);
        if (gate) {
          const missing = gate.requires.filter((f) => !tierHas(ctx!.tier, f as FeatureValue));
          if (missing.length > 0) {
            const err = new UpgradeRequiredError({
              currentTier: ctx.tier,
              missingFeatures: missing as FeatureValue[],
            });
            return res.status(err.status).json(err.toJSON());
          }
        }
      }

      await proxy(target, req, res, ctx);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 402) {
        return res.status(402).json((err as unknown as { toJSON: () => unknown }).toJSON());
      }
      res.status(401).json({ statusCode: 401, error: 'Unauthorized', message: err.message });
    }
  });

  const port = Number(env('PORT', '8080'));
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[gateway] up on :${port}, routes to:`, SERVICE_URLS);
}

if (require.main === module) {
  bootstrap();
}
