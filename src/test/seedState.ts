import { vi } from 'vitest'
import { DEFAULT_USER_STATE, STORAGE_KEY, type UserState } from '@/state/userState'

/**
 * Uloží uživatelský stav dřív, než se App načte (provider čte úložiště při startu).
 * localStorage v jsdom testech v tomto Node nefunguje spolehlivě, proto se nahradí pamětí (vi.stubGlobal;
 * uklidí `vi.unstubAllGlobals()`). Vrací mapu s uloženými hodnotami pro ověření, co se zapsalo.
 */
export function seedUserState(partial: Partial<UserState> = {}): Map<string, string> {
  const mem = new Map<string, string>([[STORAGE_KEY, JSON.stringify({ ...DEFAULT_USER_STATE, ...partial })]])
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
  })
  return mem
}
