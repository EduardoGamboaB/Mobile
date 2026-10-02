import 'reflect-metadata';
import { Module, NestMiddleware, Inject } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { tierHas, UpgradeRequiredError, type FeatureValue } from '@g3/contracts';
import { extractContext } from './middleware/jwt-context';
import { matchGate } from './middleware/tier-gate';
import { resolveUpstream, type ServiceUrls } from './proxy/router';
import { rateLimitFromEnv } from './middleware/rate-limit';
import { isInternalOnlyPath } from './middleware/internal-routes';

const env = (k: string, fallback?: string): string => process.env[k] ?? fallback ?? '';

const SERVICE_URLS: ServiceUrls = {
  auth: env('AUTH_URL', 'http://localhost:8081'),
  billing: env('BILLING_URL', 'http://localhost:8082'),
  drivers: env('DRIVERS_URL', 'http://localhost:8083'),
  fleet: env('FLEET_URL', 'http://localhost:8084'),
  trips: env('TRIPS_URL', 'http://localhost:8085'),
  alerts: env('ALERTS_URL', 'http://localhost:8086'),
  ai: env('AI_URL', 'http://localhost:8087'),
  integrations: env('INTEGRATIONS_URL', 'http://localhost:8088'),
};

const JWT_SECRET = env('JWT_ACCESS_SECRET', 'a'.repeat(32));

/** Rutas que NO requieren JWT (públicas). */
const PUBLIC_PATHS = [
  /^\/api\/auth\/(login|register-company|refresh)$/,
  // G3 Drive: OTP por SMS; recuperación de contraseña de Admin
  /^\/api\/auth\/(otp\/request|otp\/verify|password\/forgot|password\/reset)$/,
  /^\/api\/webhooks\/stripe$/,
  /^\/health$/,
  // MFA paso 2 / enrolamiento forzado: autenticados por mfaToken, no por JWT
  /^\/api\/auth\/mfa\/(verify|challenge\/enroll|challenge\/confirm)$/,
  // SSO OIDC: descubrir, iniciar y callback ocurren antes de tener JWT
  /^\/api\/auth\/sso\/(discover|start|callback)$/,
];
/** Webhook de telemetría: autenticado por `x-g3-ingest-token` en fleet, no por JWT. */
PUBLIC_PATHS.push(/^\/api\/telemetry\/ingest\/[a-z0-9_-]+$/);

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.some((r) => r.test(path));
}

async function proxy(upstream: string, req: Request, res: Response, ctx?: { companyId: string; tier: string; userId: string; role: string; driverId?: string }) {
  const url = `${upstream}${req.originalUrl}`;
  const headers: Record<string, string> = { 'content-type': req.header('content-type') ?? 'application/json' };
  // Bitácora de auditoría: IP real del cliente (req.ip respeta `trust proxy`,
  // así un X-Forwarded-For falsificado por el cliente no la sobrescribe).
  if (req.ip) headers['x-client-ip'] = req.ip;
  const ua = req.header('user-agent');
  if (ua) headers['user-agent'] = ua;
  if (ctx) {
    headers['x-company-id'] = ctx.companyId;
    headers['x-tier'] = ctx.tier;
    headers['x-user-id'] = ctx.userId;
    headers['x-user-role'] = ctx.role;
    if (ctx.driverId) headers['x-driver-id'] = ctx.driverId;
  }
  const ingestToken = req.header('x-g3-ingest-token');
  if (ingestToken) headers['x-g3-ingest-token'] = ingestToken;
  const init: RequestInit = {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method)
      ? undefined
      : typeof req.body === 'string'
        ? req.body // text/plain (ASCII de Suntech/Queclink) pasa tal cual
        : JSON.stringify(req.body),
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
  // Saltos de proxy confiables delante del gateway (LB de GCP = 2 en prod).
  http.set('trust proxy', Number(env('TRUST_PROXY_HOPS', '1')));
  // JSON explícito: el parser por defecto de Nest se registra en listen(),
  // DESPUÉS de los http.use de abajo, y el proxy/rate limit verían body {}.
  (app as unknown as import('@nestjs/platform-express').NestExpressApplication).useBodyParser('json', { limit: '1mb' });
  // Webhooks de telemetría ASCII (Suntech/Queclink) llegan como text/plain.
  (app as unknown as import('@nestjs/platform-express').NestExpressApplication).useBodyParser('text', {
    type: ['text/plain'],
    limit: '1mb',
  });

  http.get('/health', (_req, res) => res.json({ ok: true, services: Object.keys(SERVICE_URLS) }));

  // Rutas internas servicio→servicio (/api/trips/internal/*, /api/integrations/internal/*): 404 sin reenviar.
  http.use((req: Request, res: Response, next: NextFunction) =>
    isInternalOnlyPath(req.path)
      ? res.status(404).json({ statusCode: 404, error: 'Not Found', message: 'Ruta no encontrada' })
      : next(),
  );
  // Rate limit de rutas públicas sensibles (auth, ingesta). Ver middleware/rate-limit.ts.
  http.use(rateLimitFromEnv());

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
