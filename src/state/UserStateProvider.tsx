import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { People } from '@/domain/portions';
import type { Recipe } from '@/domain/types';
import { defaultStorage, LocalStorageAdapter } from './storage';
import type { StorageAdapter, StorageLike, StorageMode } from './storage';
import {
  deleteCustomRecipe as deleteCustomRecipeFn,
  importCustomRecipes as importCustomRecipesFn,
  removeFromCart as removeFromCartFn,
  setCartMultiplier as setCartMultiplierFn,
  setDayFactor as setDayFactorFn,
  setPeople as setPeopleFn,
  toggleCart as toggleCartFn,
  toggleFavorite as toggleFavoriteFn,
  updateSettings as updateSettingsFn,
  upsertCustomRecipe as upsertCustomRecipeFn,
} from './userState';
import type { UserState } from './userState';

const SAVE_DEBOUNCE_MS = 300;

interface UserStateApi {
  state: UserState;
  toggleFavorite(id: string): void;
  toggleCart(id: string): void;
  setCartMultiplier(id: string, multiplier: number): void;
  removeFromCart(id: string): void;
  setPeople(patch: Partial<People>): void;
  setDayFactor(value: number): void;
  updateSettings(patch: Partial<UserState['settings']>): void;
  /** Mělké sloučení nejvyšší úrovně: vnořené objekty (people, settings) se nahrazují celé. */
  update(patch: Partial<Omit<UserState, 'version'>>): void;
  /** Nahradí celý stav (import zálohy); uloží se jako každá jiná změna. */
  replaceState(next: UserState): void;
  /** Uloží nový nebo upravený vlastní recept (podle id). */
  saveCustomRecipe(recipe: Recipe): void;
  /** Smaže vlastní recept včetně záznamů v košíku a oblíbených. */
  deleteCustomRecipe(id: string): void;
  /** Přidá importované vlastní recepty; existující id přepíše jen s `overwrite`. */
  importCustomRecipes(recipes: readonly Recipe[], overwrite: boolean): void;
  /** Kam se právě ukládá (ukazuje tiráž). */
  storageMode: StorageMode;
  /** Znovu se připojí k serveru (známý adaptér, jinak znovu `connect`); splní se, až je výsledek znám. */
  retryServer(): Promise<void>;
}

const UserStateContext = createContext<UserStateApi | null>(null);

export function UserStateProvider({
  children,
  storage: storageProp,
  connect,
}: {
  children: ReactNode;
  storage?: StorageLike;
  /** Najde serverové úložiště (App předává detectServer); bez něj se ukládá jen lokálně. */
  connect?: () => Promise<StorageAdapter | null>;
}) {
  const [local] = useState(() => new LocalStorageAdapter(storageProp ?? defaultStorage()));
  // první vykreslení synchronně z lokální cache – bez bliknutí výchozího stavu (ruling R3)
  const [state, setState] = useState<UserState>(() => local.read());
  const [storageMode, setStorageMode] = useState<StorageMode>('local');
  const lastSaved = useRef(state);
  const latest = useRef(state);
  /** Adaptér, jehož obsah byl úspěšně načten – jen na něj se posílají změny. */
  const remote = useRef<StorageAdapter | null>(null);
  /** Nalezený server, jehož počáteční načtení selhalo; změny na něj nejdou, dokud se nenačte (retryServer). */
  const pendingAdapter = useRef<StorageAdapter | null>(null);
  const pendingRemote = useRef<UserState | null>(null);
  const sending = useRef(false);
  /** Probíhá připojení/opětovné načtení serveru – druhé se nespouští. */
  const attaching = useRef(false);
  /** Lokální změna, kterou server ještě nepotvrdil – při obnovení serveru má přednost (ruling R2a). */
  const unsynced = useRef<boolean>(local.readUnsynced());
  // příznak se ukládá i do úložiště, aby neodeslaná změna přežila obnovení stránky
  const setUnsynced = useCallback(
    (flag: boolean) => {
      if (unsynced.current === flag) return;
      unsynced.current = flag;
      local.writeUnsynced(flag);
    },
    [local],
  );
  const mounted = useRef(false);
  const storageModeRef = useRef<StorageMode>('local');
  const connectRef = useRef(connect);
  useEffect(() => {
    latest.current = state;
    storageModeRef.current = storageMode;
    connectRef.current = connect;
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const setMode = useCallback((mode: StorageMode) => {
    if (mounted.current) setStorageMode(mode);
  }, []);

  // Na server jde nejvýš jeden PUT naráz; mezitím čeká jen nejnovější stav.
  const sendRemote = useCallback(async () => {
    if (sending.current) return;
    sending.current = true;
    try {
      while (pendingRemote.current && remote.current) {
        const next = pendingRemote.current;
        pendingRemote.current = null;
        try {
          await remote.current.save(next);
          if (pendingRemote.current === null) setUnsynced(false);
          setMode('server');
        } catch {
          setMode('server-unavailable');
          return;
        }
      }
    } finally {
      sending.current = false;
    }
  }, [setMode, setUnsynced]);

  const pushRemote = useCallback(
    (next: UserState) => {
      if (!remote.current) {
        // server ještě není načten (probíhá detekce/load, nebo selhal): nic se neposílá,
        // změna se jen označí jako neodeslaná (při připojení má přednost); bez connect nehrozí
        if (connectRef.current) setUnsynced(true);
        return;
      }
      pendingRemote.current = next;
      setUnsynced(true);
      void sendRemote();
    },
    [sendRemote, setUnsynced],
  );

  // Okamžitě uloží neuloženou změnu (debounce, beforeunload, pagehide, unmount): lokálně i na server.
  const flush = useCallback(() => {
    if (latest.current === lastSaved.current) return;
    local.write(latest.current);
    lastSaved.current = latest.current;
    pushRemote(latest.current);
  }, [local, pushRemote]);

  // Serverový stav: do lokální cache a do UI, bez zpětného odeslání.
  const adopt = useCallback(
    (next: UserState) => {
      local.write(next);
      lastSaved.current = next;
      latest.current = next;
      setState(next);
    },
    [local],
  );

  // Připojení k serveru (ruling R2): serverový stav, pokud existuje, jinak nahrát lokální;
  // neodeslané lokální změny a změna během připojování mají přednost.
  const attachOnce = useCallback(
    async (adapter: StorageAdapter) => {
      const before = latest.current;
      let fromServer: UserState | null;
      try {
        fromServer = await adapter.load();
      } catch {
        // obsah serveru neznáme: nic neposílat, aby se nepřepsala data z jiného zařízení
        pendingAdapter.current = adapter;
        remote.current = null;
        setMode('server-unavailable');
        return;
      }
      if (!mounted.current) return;
      remote.current = adapter;
      pendingAdapter.current = null;
      const localChanged = latest.current !== before || latest.current !== lastSaved.current;
      if (fromServer && !unsynced.current && !localChanged) {
        adopt(fromServer);
        setMode('server');
      } else {
        pushRemote(latest.current);
      }
    },
    [adopt, pushRemote, setMode],
  );

  const attach = useCallback(
    async (adapter: StorageAdapter) => {
      if (attaching.current) return;
      attaching.current = true;
      try {
        await attachOnce(adapter);
      } finally {
        attaching.current = false;
      }
    },
    [attachOnce],
  );

  useEffect(() => {
    const find = connectRef.current;
    if (!find) return;
    let cancelled = false;
    find().then(
      (adapter) => {
        if (!cancelled && adapter) return attach(adapter);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [attach]);

  const retryServer = useCallback(async () => {
    let adapter = remote.current ?? pendingAdapter.current;
    if (!adapter) {
      try {
        adapter = (await connectRef.current?.()) ?? null;
      } catch {
        adapter = null;
      }
    }
    if (!adapter) {
      setMode('local');
      return;
    }
    await attach(adapter);
  }, [attach, setMode]);

  // Návrat na stránku (karta na pozadí mohla mít starý stav nebo nedostupný server):
  // znovu načíst server; attach převezme serverový stav jen bez neodeslaných lokálních změn.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (remote.current) {
        void attach(remote.current);
      } else if (pendingAdapter.current || (connectRef.current && storageModeRef.current !== 'local')) {
        void retryServer();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [attach, retryServer]);

  // Debounce: uloží se až po 300 ms bez další změny; nezměněný stav se neukládá.
  useEffect(() => {
    if (state === lastSaved.current) return;
    const timer = setTimeout(flush, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state, flush]);

  // Neztratit změnu < 300 ms před zavřením stránky nebo odmontováním.
  useEffect(() => {
    // iOS Safari `beforeunload` nespouští, proto i `pagehide`
    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  const toggleFavorite = useCallback((id: string) => setState((s) => toggleFavoriteFn(s, id)), []);
  const toggleCart = useCallback((id: string) => setState((s) => toggleCartFn(s, id)), []);
  const setCartMultiplier = useCallback(
    (id: string, multiplier: number) => setState((s) => setCartMultiplierFn(s, id, multiplier)),
    [],
  );
  const removeFromCart = useCallback((id: string) => setState((s) => removeFromCartFn(s, id)), []);
  const setPeople = useCallback((patch: Partial<People>) => setState((s) => setPeopleFn(s, patch)), []);
  const setDayFactor = useCallback((value: number) => setState((s) => setDayFactorFn(s, value)), []);
  const updateSettings = useCallback(
    (patch: Partial<UserState['settings']>) => setState((s) => updateSettingsFn(s, patch)),
    [],
  );
  const update = useCallback(
    (patch: Partial<Omit<UserState, 'version'>>) => setState((s) => ({ ...s, ...patch })),
    [],
  );
  const replaceState = useCallback((next: UserState) => setState(next), []);
  const saveCustomRecipe = useCallback((recipe: Recipe) => setState((s) => upsertCustomRecipeFn(s, recipe)), []);
  const deleteCustomRecipe = useCallback((id: string) => setState((s) => deleteCustomRecipeFn(s, id)), []);
  const importCustomRecipes = useCallback(
    (recipes: readonly Recipe[], overwrite: boolean) => setState((s) => importCustomRecipesFn(s, recipes, overwrite)),
    [],
  );

  const value = useMemo(
    () => ({ state, toggleFavorite, toggleCart, setCartMultiplier, removeFromCart, setPeople, setDayFactor, updateSettings, update, replaceState, saveCustomRecipe, deleteCustomRecipe, importCustomRecipes, storageMode, retryServer }),
    [state, toggleFavorite, toggleCart, setCartMultiplier, removeFromCart, setPeople, setDayFactor, updateSettings, update, replaceState, saveCustomRecipe, deleteCustomRecipe, importCustomRecipes, storageMode, retryServer],
  );
  return <UserStateContext.Provider value={value}>{children}</UserStateContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUserState(): UserStateApi {
  const ctx = useContext(UserStateContext);
  if (!ctx) throw new Error('useUserState musí být použit uvnitř UserStateProvider');
  return ctx;
}
