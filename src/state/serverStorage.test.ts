import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_HEALTH, API_STATE, DETECT_TIMEOUT_MS, FileServerAdapter, KEEPALIVE_MAX_BYTES, SERVER_TIMEOUT_MS, detectServer, fetchWithTimeout } from './serverStorage';
import type { FetchFn } from './serverStorage';
import { DEFAULT_USER_STATE, MULTIPLIER_MAX, toggleFavorite } from './userState';

const reply = (body: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;
/** Vite dev a statický hosting vracejí na neznámou cestu index.html se stavem 200. */
const htmlReply = () =>
  ({ ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token <'); } }) as unknown as Response;
/** Spojení, které nikdy neodpoví (reaguje jen na zrušení). */
const hanging: FetchFn = (_url, init) =>
  new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))));

afterEach(() => vi.useRealTimers());

describe('fetchWithTimeout', () => {
  it('po limitu odmítne a zruší požadavek', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const fetchFn: FetchFn = (url, init) => {
      signal = init?.signal ?? undefined;
      return hanging(url, init);
    };
    const assertion = expect(fetchWithTimeout(fetchFn, '/x', {}, 1000)).rejects.toThrow('Časový limit 1000 ms');
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(signal?.aborted).toBe(true);
  });

  it('po odpovědi zruší časovač', async () => {
    vi.useFakeTimers();
    await fetchWithTimeout(async () => reply({}), '/x', {}, 1000);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('FileServerAdapter', () => {
  it('load načte stav z GET /api/state a opraví ho přes parseUserState', async () => {
    const fetchFn = vi.fn<FetchFn>(async () => reply({ version: 1, favorites: ['a'], cart: [{ recipeId: 'x', multiplier: 50 }] }));
    const s = await new FileServerAdapter({ fetchFn }).load();
    expect(fetchFn).toHaveBeenCalledWith(API_STATE, expect.objectContaining({ cache: 'no-store' }));
    expect(s?.favorites).toEqual(['a']);
    expect(s?.cart).toEqual([{ recipeId: 'x', multiplier: MULTIPLIER_MAX }]);
  });

  it('load vrátí null, když server stav nemá nebo není platný', async () => {
    await expect(new FileServerAdapter({ fetchFn: async () => reply(null) }).load()).resolves.toBeNull();
    await expect(new FileServerAdapter({ fetchFn: async () => reply({ version: 2 }) }).load()).resolves.toBeNull();
  });

  it('load při chybě serveru nebo sítě odmítne', async () => {
    await expect(new FileServerAdapter({ fetchFn: async () => reply({ error: 'x' }, 500) }).load()).rejects.toThrow('500');
    await expect(new FileServerAdapter({ fetchFn: async () => { throw new TypeError('Failed to fetch'); } }).load()).rejects.toThrow();
  });

  it('save pošle PUT s JSON a keepalive (přežije zavření stránky)', async () => {
    const fetchFn = vi.fn<FetchFn>(async () => reply(null, 204));
    const s = toggleFavorite(DEFAULT_USER_STATE, 'r1');
    await new FileServerAdapter({ baseUrl: 'http://pc:8787', fetchFn }).save(s);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('http://pc:8787' + API_STATE);
    expect(init).toMatchObject({ method: 'PUT', keepalive: true, headers: { 'Content-Type': 'application/json' } });
    expect(JSON.parse(String(init?.body))).toEqual(s);
  });

  it('save u velkého těla (> KEEPALIVE_MAX_BYTES) pošle PUT bez keepalive', async () => {
    const fetchFn = vi.fn<FetchFn>(async () => reply(null, 204));
    const big = { ...DEFAULT_USER_STATE, favorites: Array.from({ length: 6000 }, (_, i) => `recept-${i}`) };
    await new FileServerAdapter({ fetchFn }).save(big);
    const body = String(fetchFn.mock.calls[0][1]?.body);
    expect(new TextEncoder().encode(body).byteLength).toBeGreaterThan(KEEPALIVE_MAX_BYTES);
    expect(fetchFn.mock.calls[0][1]?.keepalive).toBe(false);
  });

  it('save odmítne, když server data nepřijme', async () => {
    await expect(new FileServerAdapter({ fetchFn: async () => reply({ error: 'x' }, 413) }).save(DEFAULT_USER_STATE)).rejects.toThrow('413');
  });

  it('zamrzlý server: load odmítne po SERVER_TIMEOUT_MS', async () => {
    vi.useFakeTimers();
    const assertion = expect(new FileServerAdapter({ fetchFn: hanging }).load()).rejects.toThrow('Časový limit');
    await vi.advanceTimersByTimeAsync(SERVER_TIMEOUT_MS);
    await assertion;
  });
});

describe('detectServer', () => {
  it('odpověď {"ok":true} vrátí FileServerAdapter se stejným fetch a adresou', async () => {
    const fetchFn = vi.fn<FetchFn>(async () => reply({ ok: true }));
    const adapter = await detectServer({ fetchFn, baseUrl: 'http://pc:8787' });
    expect(adapter).toBeInstanceOf(FileServerAdapter);
    expect(fetchFn).toHaveBeenCalledWith('http://pc:8787' + API_HEALTH, expect.objectContaining({ cache: 'no-store' }));
    fetchFn.mockResolvedValueOnce(reply(null));
    await adapter!.load();
    expect(fetchFn).toHaveBeenLastCalledWith('http://pc:8787' + API_STATE, expect.anything());
  });

  it('HTML (vite dev), 404, {"ok":false} a chyba sítě = bez serveru', async () => {
    await expect(detectServer({ fetchFn: async () => htmlReply() })).resolves.toBeNull();
    await expect(detectServer({ fetchFn: async () => reply(null, 404) })).resolves.toBeNull();
    await expect(detectServer({ fetchFn: async () => reply({ ok: false }) })).resolves.toBeNull();
    await expect(detectServer({ fetchFn: async () => { throw new TypeError('Failed to fetch'); } })).resolves.toBeNull();
  });

  it('zamrzlé spojení skončí po DETECT_TIMEOUT_MS bez serveru', async () => {
    vi.useFakeTimers();
    const result = detectServer({ fetchFn: hanging });
    await vi.advanceTimersByTimeAsync(DETECT_TIMEOUT_MS);
    await expect(result).resolves.toBeNull();
  });
});
