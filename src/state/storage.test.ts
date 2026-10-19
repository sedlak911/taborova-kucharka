import { describe, expect, it, vi } from 'vitest';
import { defaultStorage, LocalStorageAdapter } from './storage';
import { DEFAULT_USER_STATE, STORAGE_KEY, toggleFavorite } from './userState';

function memory(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(STORAGE_KEY, initial);
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe('LocalStorageAdapter', () => {
  it('prázdné úložiště: load vrátí null, read výchozí stav', async () => {
    const adapter = new LocalStorageAdapter(memory());
    await expect(adapter.load()).resolves.toBeNull();
    expect(adapter.read()).toEqual(DEFAULT_USER_STATE);
  });

  it('save a load se vrátí pod klíčem STORAGE_KEY', async () => {
    const mem = memory();
    const adapter = new LocalStorageAdapter(mem);
    const s = toggleFavorite(DEFAULT_USER_STATE, 'r1');
    await adapter.save(s);
    expect(mem.data.get(STORAGE_KEY)).toContain('"favorites":["r1"]');
    await expect(adapter.load()).resolves.toEqual(s);
  });

  it('read je synchronní a poškozený obsah nahradí výchozím stavem', () => {
    expect(new LocalStorageAdapter(memory('{nejson')).read()).toEqual(DEFAULT_USER_STATE);
  });

  it('chyba zápisu (plná kvóta) ani čtení nespadne', async () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    const adapter = new LocalStorageAdapter(broken);
    await expect(adapter.save(DEFAULT_USER_STATE)).resolves.toBeUndefined();
    await expect(adapter.load()).resolves.toBeNull();
    expect(adapter.read()).toEqual(DEFAULT_USER_STATE);
  });
});

describe('defaultStorage', () => {
  it('při zablokovaném localStorage vrátí úložiště v paměti', () => {
    const spy = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    try {
      const st = defaultStorage();
      st.setItem('k', 'v');
      expect(st.getItem('k')).toBe('v');
      expect(st.getItem('jiny')).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });
});
