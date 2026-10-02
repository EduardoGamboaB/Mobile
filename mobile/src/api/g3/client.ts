import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_PREFIX, G3_API_URL, isLive } from './config';
import { G3ApiError, type ApiError, type JwtTokens } from './types';

const TOKEN_KEY = 'g3.tokens.v1';

let memoryTokens: JwtTokens | null = null;
let refreshInFlight: Promise<JwtTokens | null> | null = null;
type UpgradeHandler = (payload: ApiError) => void;
let upgradeHandler: UpgradeHandler | null = null;
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export const tokenStore = {
  async load(): Promise<JwtTokens | null> {
    if (memoryTokens) return memoryTokens;
    const raw = await AsyncStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    try {
      memoryTokens = JSON.parse(raw) as JwtTokens;
      return memoryTokens;
    } catch {
      return null;
    }
  },
  async save(t: JwtTokens) {
    memoryTokens = t;
    await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(t));
  },
  async clear() {
    memoryTokens = null;
    await AsyncStorage.removeItem(TOKEN_KEY);
  },
  /** Set sin persistir — útil en tests para inyectar tokens */
  setInMemory(t: JwtTokens | null) {
    memoryTokens = t;
  },
};

export function onUpgradeRequired(h: UpgradeHandler) {
  upgradeHandler = h;
}
export function onUnauthorized(h: UnauthorizedHandler) {
  unauthorizedHandler = h;
}

interface RequestOpts {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Endpoints públicos saltan el JWT */
  anonymous?: boolean;
  /** No reintentar refresh en caso de 401 (evita loops). */
  noRefresh?: boolean;
  /** Override de fetch — para tests */
  fetchImpl?: typeof fetch;
}

function buildQuery(q?: RequestOpts['query']): string {
  if (!q) return '';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null) continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

async function tryRefresh(fetchImpl: typeof fetch): Promise<JwtTokens | null> {
  if (refreshInFlight) return refreshInFlight;
  const current = await tokenStore.load();
  if (!current?.refreshToken) return null;
  refreshInFlight = (async () => {
    try {
      const res = await fetchImpl(`${G3_API_URL}${API_PREFIX}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      if (!res.ok) return null;
      const next = (await res.json()) as JwtTokens;
      await tokenStore.save(next);
      return next;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  if (!isLive) {
    throw new Error(
      `G3 API call attempted in demo mode (${path}). ` +
        `Set EXPO_PUBLIC_G3_API_URL or use the demo store directly.`,
    );
  }
  const fetchImpl = opts.fetchImpl ?? fetch;
  const url = `${G3_API_URL}${API_PREFIX}${path}${buildQuery(opts.query)}`;

  const headers: Record<string, string> = { accept: 'application/json' };
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (!opts.anonymous) {
    const t = await tokenStore.load();
    if (t?.accessToken) headers.authorization = `Bearer ${t.accessToken}`;
  }

  const res = await fetchImpl(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (res.ok) return payload as T;

  if (res.status === 401 && !opts.anonymous && !opts.noRefresh) {
    const refreshed = await tryRefresh(fetchImpl);
    if (refreshed) {
      return request<T>(path, { ...opts, noRefresh: true });
    }
    if (unauthorizedHandler) unauthorizedHandler();
  }

  const body: ApiError = (payload as ApiError) ?? {
    statusCode: res.status,
    error: res.statusText,
    message: res.statusText,
  };

  if (res.status === 402 && upgradeHandler) {
    try {
      upgradeHandler(body);
    } catch {
      /* swallow */
    }
  }

  throw new G3ApiError(res.status, body);
}

/** Convenience helpers */
export const api = {
  get: <T>(path: string, opts: Omit<RequestOpts, 'method'> = {}) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts: Omit<RequestOpts, 'method' | 'body'> = {}) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts: Omit<RequestOpts, 'method' | 'body'> = {}) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, opts: Omit<RequestOpts, 'method' | 'body'> = {}) =>
    request<T>(path, { ...opts, method: 'PUT', body }),
  delete: <T>(path: string, opts: Omit<RequestOpts, 'method'> = {}) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};
