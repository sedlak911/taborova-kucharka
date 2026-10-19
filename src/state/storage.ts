import { loadUserState, saveUserState, STORAGE_KEY } from './userState';
import type { KeyValueReader, KeyValueWriter, UserState } from './userState';

/** Příznak „lokální změna, kterou server ještě nepotvrdil“ ('1'/'0'); přežije obnovení stránky. */
export const UNSYNCED_KEY = 'kucharka.unsynced.v1';

/** Kam se stav právě ukládá (ukazuje tiráž): jen prohlížeč, server, nebo server nedostupný (ukládá se lokálně). */
export type StorageMode = 'local' | 'server' | 'server-unavailable';

/** Úložiště uživatelského stavu (spec §5.2). `load` vrací null, když úložiště ještě nic neobsahuje. */
export interface StorageAdapter {
  load(): Promise<UserState | null>;
  save(state: UserState): Promise<void>;
}

export type StorageLike = KeyValueReader & KeyValueWriter;

/** localStorage může při zablokovaných datech webu vyhodit SecurityError; pak se použije paměť. */
export function defaultStorage(): StorageLike {
  try {
    // globalThis místo window: soubor načítají i skripty (tsconfig.scripts.json bez DOM)
    const ls = (globalThis as { localStorage?: StorageLike }).localStorage;
    if (!ls) throw new Error('localStorage není k dispozici');
    return ls;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => void mem.set(k, v),
    };
  }
}

/** Výchozí úložiště v prohlížeči; zároveň lokální cache při práci se serverem (ruling R2). */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly storage: StorageLike;

  constructor(storage: StorageLike = defaultStorage()) {
    this.storage = storage;
  }

  /** Synchronní čtení pro první vykreslení (bez bliknutí výchozího stavu). */
  read(): UserState {
    return loadUserState(this.storage);
  }

  write(state: UserState): void {
    saveUserState(this.storage, state);
  }

  readUnsynced(): boolean {
    try {
      return this.storage.getItem(UNSYNCED_KEY) === '1';
    } catch {
      return false;
    }
  }

  writeUnsynced(flag: boolean): void {
    try {
      this.storage.setItem(UNSYNCED_KEY, flag ? '1' : '0');
    } catch {
      // zablokované úložiště: příznak zůstane jen v paměti
    }
  }

  async load(): Promise<UserState | null> {
    try {
      if (this.storage.getItem(STORAGE_KEY) == null) return null;
    } catch {
      return null;
    }
    return this.read();
  }

  async save(state: UserState): Promise<void> {
    this.write(state);
  }
}
