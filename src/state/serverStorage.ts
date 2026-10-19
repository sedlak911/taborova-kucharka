import type { StorageAdapter } from './storage';
import { parseUserState } from './userState';
import type { UserState } from './userState';

export const API_HEALTH = '/api/health';
export const API_STATE = '/api/state';
/** Detekce nesmí zdržet: bez serveru (dev, statický build) se do 1,5 s pracuje lokálně. */
export const DETECT_TIMEOUT_MS = 1500;
export const SERVER_TIMEOUT_MS = 5000;
/**
 * Prohlížeče odmítají `keepalive` tělo nad 64 KiB (a omezují i součet rozpracovaných keepalive požadavků),
 * server přitom přijímá až 1 MB. Větší stav se proto odešle bez keepalive: při zavření stránky se nemusí
 * stihnout, ale zůstává v localStorage a odešle se při dalším otevření.
 */
export const KEEPALIVE_MAX_BYTES = 60_000;

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export interface ServerOptions {
  /** Prázdné = stejný původ jako stránka (server servíruje i web). */
  baseUrl?: string;
  timeoutMs?: number;
  fetchFn?: FetchFn;
}

/** Pozdní vazba na globální fetch (testy ho mohou podstrčit přes vi.stubGlobal). */
const globalFetch: FetchFn = (input, init) => fetch(input, init);

/** Fetch s časovým limitem; odmítne i tehdy, když fetchFn signál ignoruje. */
export function fetchWithTimeout(fetchFn: FetchFn, url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  return new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Časový limit ${ms} ms`));
    }, ms);
    try {
      // časovač rušit přímo v obsluze (ne ve .finally – to by doběhlo až po pokračování volajícího)
      fetchFn(url, { ...init, signal: controller.signal }).then(
        (res) => {
          clearTimeout(timer);
          resolve(res);
        },
        (err: unknown) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    } catch (e) {
      clearTimeout(timer);
      reject(e);
    }
  });
}

/** Stav v souboru userdata/user-state.json přes `npm run serve` (spec §5.2). */
export class FileServerAdapter implements StorageAdapter {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: FetchFn;

  constructor(options: ServerOptions = {}) {
    this.baseUrl = options.baseUrl ?? '';
    this.timeoutMs = options.timeoutMs ?? SERVER_TIMEOUT_MS;
    this.fetchFn = options.fetchFn ?? globalFetch;
  }

  async load(): Promise<UserState | null> {
    const res = await fetchWithTimeout(this.fetchFn, this.baseUrl + API_STATE, { cache: 'no-store' }, this.timeoutMs);
    if (!res.ok) throw new Error(`Server vrátil ${res.status}`);
    const body: unknown = await res.json();
    return body === null ? null : parseUserState(body);
  }

  async save(state: UserState): Promise<void> {
    const body = JSON.stringify(state);
    const res = await fetchWithTimeout(
      this.fetchFn,
      this.baseUrl + API_STATE,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body,
        // dokončí se i po zavření stránky (flush na pagehide), ale jen když se vejde do limitu prohlížeče
        keepalive: new TextEncoder().encode(body).byteLength <= KEEPALIVE_MAX_BYTES,
      },
      this.timeoutMs,
    );
    if (!res.ok) throw new Error(`Server odmítl uložení (${res.status})`);
  }
}

/** Najde server kuchařky přes GET /api/health; bez serveru (nebo s jinou odpovědí) vrátí null, nikdy neodmítne. */
export async function detectServer(options: ServerOptions = {}): Promise<FileServerAdapter | null> {
  const fetchFn = options.fetchFn ?? globalFetch;
  const baseUrl = options.baseUrl ?? '';
  try {
    const res = await fetchWithTimeout(fetchFn, baseUrl + API_HEALTH, { cache: 'no-store' }, options.timeoutMs ?? DETECT_TIMEOUT_MS);
    if (!res.ok) return null;
    const body: unknown = await res.json();
    const healthy = typeof body === 'object' && body !== null && (body as { ok?: unknown }).ok === true;
    return healthy ? new FileServerAdapter({ baseUrl, fetchFn }) : null;
  } catch {
    return null;
  }
}
