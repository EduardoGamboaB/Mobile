import type { FetchLike, HttpRequestInit } from '../src/http';

export interface Call {
  url: string;
  init: HttpRequestInit;
}

export type Reply = { status?: number; body?: unknown } | ((call: Call) => { status?: number; body?: unknown });

/** `fetch` falso: registra llamadas y responde en orden (la última se repite). */
export function fakeFetch(...replies: Reply[]): FetchLike & { calls: Call[] } {
  const calls: Call[] = [];
  const fn = (async (url: string, init: HttpRequestInit) => {
    const call = { url, init };
    calls.push(call);
    const r = replies[Math.min(calls.length - 1, replies.length - 1)] ?? {};
    const { status = 200, body } = typeof r === 'function' ? r(call) : r;
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body)),
    };
  }) as FetchLike & { calls: Call[] };
  fn.calls = calls;
  return fn;
}

export const form = (body?: string) => Object.fromEntries(new URLSearchParams(body ?? ''));
export const decodeBasic = (h: string) => Buffer.from(h.replace(/^Basic /, ''), 'base64').toString('utf8');
