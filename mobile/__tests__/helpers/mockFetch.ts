/**
 * Mock de fetch para tests del cliente G3 API.
 *
 *   const m = makeFetchMock();
 *   m.on('POST /api/auth/login', { status: 200, body: {...} });
 *   const res = await authApi.login({...}); // usa el global override
 *
 * Soporta:
 *  - `on(method+path, response)` — match exacto, una vez (FIFO si se registra múltiples veces)
 *  - `onAny(matcher, response)` — más flexible vía función
 *  - `calls` — historial completo para assertions
 *  - Respuestas dinámicas via función `(req) => Response`
 */

export interface MockRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface MockResponse {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

type ResponseFn = (req: MockRequest) => MockResponse | Promise<MockResponse>;

interface Rule {
  match: (req: MockRequest) => boolean;
  respond: ResponseFn;
  consumed: boolean;
  oneShot: boolean;
}

export interface FetchMock {
  fetch: typeof fetch;
  calls: MockRequest[];
  on: (signature: string, response: MockResponse | ResponseFn) => FetchMock;
  onAny: (matcher: (req: MockRequest) => boolean, response: MockResponse | ResponseFn) => FetchMock;
  reset: () => void;
}

function parseSignature(sig: string): { method: string; path: string } {
  const [method, path] = sig.split(/\s+/);
  return { method: method.toUpperCase(), path };
}

function buildResponse(r: MockResponse): Response {
  const status = r.status ?? 200;
  const headers = new Headers({ 'content-type': 'application/json', ...(r.headers ?? {}) });
  // 204/205/304 prohíben body en el constructor de Response
  const nullBodyStatus = status === 204 || status === 205 || status === 304;
  const body = nullBodyStatus || r.body === undefined ? null : JSON.stringify(r.body);
  return new Response(body, { status, headers });
}

export function makeFetchMock(): FetchMock {
  const rules: Rule[] = [];
  const calls: MockRequest[] = [];

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input as URL).toString();
    const method = (init?.method ?? 'GET').toUpperCase();
    const headers: Record<string, string> = {};
    if (init?.headers) {
      const h = new Headers(init.headers as HeadersInit);
      h.forEach((v: string, k: string) => {
        headers[k.toLowerCase()] = v;
      });
    }
    let body: unknown = null;
    if (init?.body && typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    const req: MockRequest = { url, method, headers, body };
    calls.push(req);

    const rule = rules.find((r) => !r.consumed && r.match(req)) ?? rules.find((r) => r.match(req));
    if (!rule) {
      return new Response(JSON.stringify({ message: `Unmatched ${method} ${url}` }), {
        status: 599,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (rule.oneShot) rule.consumed = true;
    const r = await rule.respond(req);
    return buildResponse(r);
  };

  const api: FetchMock = {
    fetch: fetchImpl,
    calls,
    on(signature, response) {
      const { method, path } = parseSignature(signature);
      const respond: ResponseFn = typeof response === 'function' ? response : () => response;
      rules.push({
        match: (req) => req.method === method && req.url.endsWith(path),
        respond,
        consumed: false,
        oneShot: true,
      });
      return api;
    },
    onAny(matcher, response) {
      const respond: ResponseFn = typeof response === 'function' ? response : () => response;
      rules.push({ match: matcher, respond, consumed: false, oneShot: false });
      return api;
    },
    reset() {
      rules.length = 0;
      calls.length = 0;
    },
  };
  return api;
}

/**
 * Aplica el mock al global fetch — útil para módulos que no aceptan fetchImpl.
 * Retorna teardown.
 */
export function installGlobalFetchMock(m: FetchMock): () => void {
  const prev = global.fetch;
  global.fetch = m.fetch as typeof fetch;
  return () => {
    global.fetch = prev;
  };
}
