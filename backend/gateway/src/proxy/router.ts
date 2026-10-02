export interface ServiceUrls {
  auth: string;
  billing: string;
  drivers: string;
  fleet: string;
  trips: string;
  alerts: string;
  ai: string;
}

const ROUTES: { prefix: RegExp; service: keyof ServiceUrls }[] = [
  { prefix: /^\/api\/auth(\/|$)/, service: 'auth' },
  { prefix: /^\/api\/companies(\/|$)/, service: 'auth' },
  { prefix: /^\/api\/users(\/|$)/, service: 'auth' },
  { prefix: /^\/api\/subscriptions(\/|$)/, service: 'billing' },
  { prefix: /^\/api\/webhooks\/stripe(\/|$)/, service: 'billing' },
  { prefix: /^\/api\/drivers(\/|$)/, service: 'drivers' },
  { prefix: /^\/api\/tractors(\/|$)/, service: 'fleet' },
  { prefix: /^\/api\/trailers(\/|$)/, service: 'fleet' },
  { prefix: /^\/api\/devices(\/|$)/, service: 'fleet' },
  { prefix: /^\/api\/vehicles(\/|$)/, service: 'fleet' },
  { prefix: /^\/api\/telemetry(\/|$)/, service: 'fleet' },
  { prefix: /^\/api\/trips(\/|$)/, service: 'trips' },
  { prefix: /^\/api\/expense-policy(\/|$)/, service: 'trips' },
  { prefix: /^\/api\/alerts(\/|$)/, service: 'alerts' },
  { prefix: /^\/api\/incidents(\/|$)/, service: 'alerts' },
  { prefix: /^\/api\/alert-rules(\/|$)/, service: 'alerts' },
  { prefix: /^\/api\/notification-contacts(\/|$)/, service: 'alerts' },
  { prefix: /^\/api\/ai(\/|$)/, service: 'ai' },
];

export function resolveUpstream(path: string, urls: ServiceUrls): string | null {
  for (const r of ROUTES) {
    if (r.prefix.test(path)) return urls[r.service];
  }
  return null;
}
