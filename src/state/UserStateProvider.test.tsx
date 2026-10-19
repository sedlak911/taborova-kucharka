import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { customRecipe } from '../test/customRecipe';
import { UserStateProvider, useUserState } from './UserStateProvider';
import { defaultStorage, UNSYNCED_KEY } from './storage';
import type { StorageAdapter, StorageLike } from './storage';
import { DEFAULT_USER_STATE, STORAGE_KEY } from './userState';
import type { UserState } from './userState';

function Probe() {
  const { state, toggleFavorite } = useUserState();
  return (
    <div>
      <span data-testid="favs">{state.favorites.join(',')}</span>
      <button onClick={() => toggleFavorite('r1')}>fav</button>
      <button onClick={() => toggleFavorite('r2')}>fav2</button>
    </div>
  );
}

function CartProbe() {
  const { state, toggleCart, setCartMultiplier, removeFromCart, setPeople, setDayFactor, updateSettings } = useUserState();
  return (
    <div>
      <span data-testid="cart">{JSON.stringify(state.cart)}</span>
      <span data-testid="people">{JSON.stringify(state.people)}</span>
      <span data-testid="day">{state.dayFactor}</span>
      <span data-testid="hist">{String(state.settings.historicalIngredients)}</span>
      <button onClick={() => toggleCart('r1')}>cart</button>
      <button onClick={() => setCartMultiplier('r1', 3)}>x3</button>
      <button onClick={() => removeFromCart('r1')}>remove</button>
      <button onClick={() => setPeople({ adults: 6, children: 18 })}>people</button>
      <button onClick={() => setDayFactor(1.2)}>day</button>
      <button onClick={() => updateSettings({ historicalIngredients: true })}>hist</button>
    </div>
  );
}

function makeStorage(initial: string | null = null) {
  return {
    getItem: vi.fn(() => initial),
    setItem: vi.fn(),
  };
}

describe('UserStateProvider', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('po přepnutí oblíbeného uloží po 300 ms JSON s id', () => {
    const storage = makeStorage();
    render(
      <UserStateProvider storage={storage}>
        <Probe />
      </UserStateProvider>,
    );
    act(() => screen.getByText('fav').click());
    expect(screen.getByTestId('favs').textContent).toBe('r1');
    expect(storage.setItem).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    const [key, json] = storage.setItem.mock.calls[0] as unknown as [string, string];
    expect(key).toBe(STORAGE_KEY);
    expect(json).toContain('r1');
  });

  it('košík, osoby, náročnost a nastavení se mění přes API a uloží se', () => {
    const storage = makeStorage();
    render(
      <UserStateProvider storage={storage}>
        <CartProbe />
      </UserStateProvider>,
    );
    act(() => screen.getByText('cart').click());
    act(() => screen.getByText('x3').click());
    act(() => screen.getByText('people').click());
    act(() => screen.getByText('day').click());
    act(() => screen.getByText('hist').click());
    expect(screen.getByTestId('cart').textContent).toBe('[{"recipeId":"r1","multiplier":3}]');
    expect(screen.getByTestId('people').textContent).toBe('{"adults":6,"children":18}');
    expect(screen.getByTestId('day').textContent).toBe('1.2');
    expect(screen.getByTestId('hist').textContent).toBe('true');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const json = (storage.setItem.mock.calls.at(-1) as unknown as string[])[1];
    expect(json).toContain('"multiplier":3');
    expect(json).toContain('"dayFactor":1.2');
    act(() => screen.getByText('remove').click());
    expect(screen.getByTestId('cart').textContent).toBe('[]');
  });

  it('více změn v rychlém sledu uloží jen jednou (debounce)', () => {
    const storage = makeStorage();
    render(
      <UserStateProvider storage={storage}>
        <Probe />
      </UserStateProvider>,
    );
    act(() => screen.getByText('fav').click());
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => screen.getByText('fav2').click());
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect((storage.setItem.mock.calls[0] as unknown as string[])[1]).toContain('"favorites":["r1","r2"]');
  });

  it('načte uložený stav a bez změny nic neukládá', () => {
    const storage = makeStorage('{"version":1,"favorites":["x"]}');
    render(
      <UserStateProvider storage={storage}>
        <Probe />
      </UserStateProvider>,
    );
    expect(screen.getByTestId('favs').textContent).toBe('x');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('při beforeunload uloží neuloženou změnu hned', () => {
    const storage = makeStorage();
    render(
      <UserStateProvider storage={storage}>
        <Probe />
      </UserStateProvider>,
    );
    act(() => screen.getByText('fav').click());
    expect(storage.setItem).not.toHaveBeenCalled();
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect((storage.setItem.mock.calls[0] as unknown as string[])[1]).toContain('r1');
  });

  it('při pagehide (iOS Safari) uloží neuloženou změnu hned', () => {
    const storage = makeStorage();
    render(
      <UserStateProvider storage={storage}>
        <Probe />
      </UserStateProvider>,
    );
    act(() => screen.getByText('fav').click());
    expect(storage.setItem).not.toHaveBeenCalled();
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('při unmountu uloží neuloženou změnu', () => {
    const storage = makeStorage();
    const { unmount } = render(
      <UserStateProvider storage={storage}>
        <Probe />
      </UserStateProvider>,
    );
    act(() => screen.getByText('fav').click());
    unmount();
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('zablokované window.localStorage nespadne, použije paměť', () => {
    const spy = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    try {
      const st = defaultStorage();
      st.setItem('k', 'v');
      expect(st.getItem('k')).toBe('v');
      expect(st.getItem('jiny')).toBeNull();
      render(
        <UserStateProvider>
          <Probe />
        </UserStateProvider>,
      );
      act(() => screen.getByText('fav').click());
      expect(screen.getByTestId('favs').textContent).toBe('r1');
    } finally {
      spy.mockRestore();
    }
  });
});

const withFavs = (...favorites: string[]): UserState => ({ ...structuredClone(DEFAULT_USER_STATE), favorites });

function fakeServer(initial: UserState | null) {
  const srv = { stored: initial, fail: false };
  const adapter = {
    load: vi.fn(async () => {
      if (srv.fail) throw new Error('server nedostupný');
      return srv.stored;
    }),
    save: vi.fn(async (next: UserState) => {
      if (srv.fail) throw new Error('server nedostupný');
      srv.stored = next;
    }),
  };
  return { srv, adapter };
}

function StorageProbe() {
  const { state, storageMode, toggleFavorite, retryServer, replaceState } = useUserState();
  return (
    <div>
      <span data-testid="favs">{state.favorites.join(',')}</span>
      <span data-testid="mode">{storageMode}</span>
      <button onClick={() => toggleFavorite('r1')}>fav</button>
      <button onClick={() => void retryServer()}>retry</button>
      <button onClick={() => replaceState(withFavs('imp'))}>import</button>
    </div>
  );
}

/** Proběhnou čekající sliby (připojení, načtení, PUT). */
const settle = () =>
  act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
const afterDebounce = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
const mode = () => screen.getByTestId('mode').textContent;
const favs = () => screen.getByTestId('favs').textContent;
const lastJson = (storage: { setItem: { mock: { calls: unknown[] } } }) =>
  (storage.setItem.mock.calls.filter((c) => (c as unknown as string[])[0] === STORAGE_KEY).at(-1) as unknown as string[])[1];

/** Úložiště s opravdovou pamětí (pro příznak neodeslané změny). */
function makeMapStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: vi.fn((k: string) => data.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void data.set(k, v)),
  };
}

async function renderWith<S extends StorageLike = ReturnType<typeof makeStorage>>(connect: () => Promise<StorageAdapter | null>, storage: S = makeStorage() as unknown as S) {
  render(
    <UserStateProvider storage={storage} connect={connect}>
      <StorageProbe />
    </UserStateProvider>,
  );
  await settle();
  return storage;
}

describe('UserStateProvider se serverem', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('bez connect je režim local', () => {
    render(
      <UserStateProvider storage={makeStorage()}>
        <StorageProbe />
      </UserStateProvider>,
    );
    expect(mode()).toBe('local');
  });

  it('server se stavem je zdroj pravdy: převezme se a uloží do lokální cache, nic se neposílá zpět', async () => {
    const { adapter } = fakeServer(withFavs('srv'));
    const storage = await renderWith(async () => adapter, makeStorage('{"version":1,"favorites":["loc"]}'));
    expect(favs()).toBe('srv');
    expect(mode()).toBe('server');
    expect(lastJson(storage)).toContain('"favorites":["srv"]');
    await afterDebounce();
    expect(adapter.save).not.toHaveBeenCalled();
  });

  it('server bez stavu: nahraje se lokální stav', async () => {
    const { srv, adapter } = fakeServer(null);
    await renderWith(async () => adapter, makeStorage('{"version":1,"favorites":["loc"]}'));
    expect(favs()).toBe('loc');
    expect(srv.stored?.favorites).toEqual(['loc']);
    expect(mode()).toBe('server');
  });

  it('změna se uloží do lokální cache i na server', async () => {
    const { srv, adapter } = fakeServer(withFavs('srv'));
    const storage = await renderWith(async () => adapter);
    act(() => screen.getByText('fav').click());
    await afterDebounce();
    await settle();
    expect(adapter.save).toHaveBeenCalledTimes(1);
    expect(srv.stored?.favorites).toEqual(['srv', 'r1']);
    expect(lastJson(storage)).toContain('"favorites":["srv","r1"]');
  });

  it('když ukládání na server selže, režim je server-unavailable a změna zůstane lokálně; po obnovení se neodeslaná změna nahraje', async () => {
    const { srv, adapter } = fakeServer(withFavs('srv'));
    const storage = await renderWith(async () => adapter);
    srv.fail = true;
    act(() => screen.getByText('fav').click());
    await afterDebounce();
    await settle();
    expect(mode()).toBe('server-unavailable');
    expect(lastJson(storage)).toContain('"favorites":["srv","r1"]');
    srv.stored = withFavs('jine-zarizeni');
    srv.fail = false;
    act(() => screen.getByText('retry').click());
    await settle();
    expect(mode()).toBe('server');
    expect(favs()).toBe('srv,r1');
    expect(srv.stored?.favorites).toEqual(['srv', 'r1']);
  });

  it('načtení ze serveru selže: lokální stav, server-unavailable; obnovení bez lokálních změn převezme serverový stav', async () => {
    const { srv, adapter } = fakeServer(withFavs('srv'));
    srv.fail = true;
    await renderWith(async () => adapter, makeStorage('{"version":1,"favorites":["loc"]}'));
    expect(mode()).toBe('server-unavailable');
    expect(favs()).toBe('loc');
    srv.fail = false;
    act(() => screen.getByText('retry').click());
    await settle();
    expect(mode()).toBe('server');
    expect(favs()).toBe('srv');
  });

  it('po selhání počátečního load() změna nepošle PUT; retry s úspěšným load() převezme serverový stav', async () => {
    const { srv, adapter } = fakeServer(withFavs('srv'));
    srv.fail = true;
    await renderWith(async () => adapter, makeStorage('{"version":1,"favorites":["loc"]}'));
    expect(mode()).toBe('server-unavailable');
    act(() => screen.getByText('fav').click());
    await afterDebounce();
    await settle();
    expect(adapter.save).not.toHaveBeenCalled();
    expect(mode()).toBe('server-unavailable');
    srv.fail = false;
    act(() => screen.getByText('retry').click());
    await settle();
    // změna provedená offline má přednost a nahraje se až po úspěšném načtení serveru
    expect(adapter.load).toHaveBeenCalledTimes(2);
    expect(mode()).toBe('server');
    expect(srv.stored?.favorites).toEqual(['loc', 'r1']);
  });

  it('změna během čekajícího load(), který pak selže: po retry se lokální změna odešle a serverový stav se nepřevezme', async () => {
    const { srv, adapter } = fakeServer(withFavs('srv'));
    let fail!: () => void;
    adapter.load.mockImplementationOnce(() => new Promise((_, reject) => (fail = () => reject(new Error('x')))));
    await renderWith(async () => adapter, makeStorage('{"version":1,"favorites":["loc"]}'));
    act(() => screen.getByText('fav').click());
    await afterDebounce();
    await act(async () => fail());
    await settle();
    expect(mode()).toBe('server-unavailable');
    expect(adapter.save).not.toHaveBeenCalled();
    act(() => screen.getByText('retry').click());
    await settle();
    expect(mode()).toBe('server');
    expect(favs()).toBe('loc,r1');
    expect(srv.stored?.favorites).toEqual(['loc', 'r1']);
  });

  it('příznak neodeslané změny v úložišti přežije reload: lokální stav se odešle a příznak se vynuluje', async () => {
    const { srv, adapter } = fakeServer(withFavs('srv'));
    const storage = makeMapStorage({ [STORAGE_KEY]: '{"version":1,"favorites":["loc"]}', [UNSYNCED_KEY]: '1' });
    await renderWith(async () => adapter, storage);
    expect(favs()).toBe('loc');
    expect(srv.stored?.favorites).toEqual(['loc']);
    expect(mode()).toBe('server');
    expect(storage.data.get(UNSYNCED_KEY)).toBe('0');
  });

  it('po úspěšném PUT běžné změny je příznak neodeslané změny 0', async () => {
    const { adapter } = fakeServer(withFavs('srv'));
    const storage = makeMapStorage();
    await renderWith(async () => adapter, storage);
    act(() => screen.getByText('fav').click());
    await afterDebounce();
    await settle();
    expect(adapter.save).toHaveBeenCalledTimes(1);
    expect(storage.data.get(UNSYNCED_KEY)).toBe('0');
  });

  it('server se objeví později: retry znovu zavolá connect a převezme serverový stav', async () => {
    const { adapter } = fakeServer(withFavs('srv'));
    const connect = vi.fn<() => Promise<StorageAdapter | null>>().mockResolvedValueOnce(null).mockResolvedValueOnce(adapter);
    await renderWith(connect, makeStorage('{"version":1,"favorites":["loc"]}'));
    expect(mode()).toBe('local');
    act(() => screen.getByText('retry').click());
    await settle();
    expect(connect).toHaveBeenCalledTimes(2);
    expect(mode()).toBe('server');
    expect(favs()).toBe('srv');
  });

  it('změna během připojování vyhrává nad serverovým stavem a nahraje se', async () => {
    const { srv, adapter } = fakeServer(withFavs('srv'));
    let finishConnect!: (a: StorageAdapter) => void;
    const connect = () => new Promise<StorageAdapter | null>((resolve) => (finishConnect = resolve));
    await renderWith(connect);
    act(() => screen.getByText('fav').click());
    await act(async () => finishConnect(adapter));
    await settle();
    expect(favs()).toBe('r1');
    expect(srv.stored?.favorites).toEqual(['r1']);
  });

  it('pagehide pošle neuloženou změnu i na server', async () => {
    const { srv, adapter } = fakeServer(withFavs('srv'));
    await renderWith(async () => adapter);
    act(() => screen.getByText('fav').click());
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    await settle();
    expect(adapter.save).toHaveBeenCalledTimes(1);
    expect(srv.stored?.favorites).toEqual(['srv', 'r1']);
  });

  it('replaceState (import) přepíše stav a uloží ho lokálně i na server', async () => {
    const { srv, adapter } = fakeServer(withFavs('srv'));
    const storage = await renderWith(async () => adapter);
    act(() => screen.getByText('import').click());
    expect(favs()).toBe('imp');
    await afterDebounce();
    await settle();
    expect(lastJson(storage)).toContain('"favorites":["imp"]');
    expect(srv.stored?.favorites).toEqual(['imp']);
  });
});

describe('UserStateProvider: návrat na stránku (visibilitychange)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const becomeVisible = () =>
    act(async () => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      for (let i = 0; i < 20; i++) await Promise.resolve();
    });

  it('po návratu na stránku se znovu načte serverový stav (bez PUT)', async () => {
    const { srv, adapter } = fakeServer(withFavs('srv'));
    await renderWith(async () => adapter);
    expect(favs()).toBe('srv');
    srv.stored = withFavs('z-notebooku');
    await becomeVisible();
    expect(favs()).toBe('z-notebooku');
    expect(mode()).toBe('server');
    await afterDebounce();
    expect(adapter.save).not.toHaveBeenCalled();
  });

  it('s neodeslanou lokální změnou se serverový stav nepřevezme a odešle se lokální', async () => {
    const { srv, adapter } = fakeServer(withFavs('srv'));
    await renderWith(async () => adapter);
    srv.fail = true;
    act(() => screen.getByText('fav').click());
    await afterDebounce();
    await settle();
    expect(mode()).toBe('server-unavailable');
    srv.fail = false;
    srv.stored = withFavs('z-notebooku');
    await becomeVisible();
    expect(favs()).toBe('srv,r1');
    expect(srv.stored?.favorites).toEqual(['srv', 'r1']);
    expect(mode()).toBe('server');
  });

  it('v režimu server-unavailable po selhaném načtení zkusí server znovu', async () => {
    const { srv, adapter } = fakeServer(withFavs('srv'));
    srv.fail = true;
    await renderWith(async () => adapter, makeStorage('{"version":1,"favorites":["loc"]}'));
    expect(mode()).toBe('server-unavailable');
    srv.fail = false;
    await becomeVisible();
    expect(adapter.load).toHaveBeenCalledTimes(2);
    expect(mode()).toBe('server');
    expect(favs()).toBe('srv');
  });
});

describe('vlastní recepty v provideru', () => {
  it('uloží, upraví, naimportuje a smaže vlastní recept a změnu zapíše do úložiště', () => {
    vi.useFakeTimers();
    const storage = makeStorage();
    const { result } = renderHook(() => useUserState(), {
      wrapper: ({ children }) => <UserStateProvider storage={storage}>{children}</UserStateProvider>,
    });
    const r = customRecipe();
    act(() => result.current.saveCustomRecipe(r));
    expect(result.current.state.customRecipes).toEqual([r]);
    act(() => result.current.saveCustomRecipe({ ...r, title: 'Lívance II' }));
    expect(result.current.state.customRecipes.map((x) => x.title)).toEqual(['Lívance II']);
    act(() => result.current.importCustomRecipes([r, customRecipe({ id: 'vlastni-jine-0001' })], false));
    expect(result.current.state.customRecipes.map((x) => [x.id, x.title])).toEqual([
      [r.id, 'Lívance II'],
      ['vlastni-jine-0001', 'Babiččiny lívance'],
    ]);
    act(() => result.current.deleteCustomRecipe(r.id));
    expect(result.current.state.customRecipes.map((x) => x.id)).toEqual(['vlastni-jine-0001']);
    act(() => vi.advanceTimersByTime(300));
    expect(JSON.parse(storage.setItem.mock.lastCall![1]).customRecipes).toHaveLength(1);
    vi.useRealTimers();
  });
});
