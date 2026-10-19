import { describe, expect, it, vi } from 'vitest';
import { OWN_ID, customRecipe } from '../test/customRecipe';
import {
  DEFAULT_USER_STATE,
  KCAL_TARGET_MAX,
  MULTIPLIER_MAX,
  PEOPLE_MAX,
  deleteCustomRecipe,
  importCustomRecipes,
  isInCart,
  loadUserState,
  parseUserState,
  removeFromCart,
  saveUserState,
  setCartMultiplier,
  setDayFactor,
  setPeople,
  toggleCart,
  toggleFavorite,
  updateSettings,
  upsertCustomRecipe,
  validCustomRecipes,
} from './userState';

describe('toggleFavorite', () => {
  it('přidá oblíbený recept a nemění původní objekt', () => {
    const next = toggleFavorite(DEFAULT_USER_STATE, 'r1');
    expect(next.favorites).toEqual(['r1']);
    expect(DEFAULT_USER_STATE.favorites).toEqual([]);
    expect(next).not.toBe(DEFAULT_USER_STATE);
  });

  it('dvojí přepnutí vrátí původní obsah', () => {
    const twice = toggleFavorite(toggleFavorite(DEFAULT_USER_STATE, 'r1'), 'r1');
    expect(twice).toEqual(DEFAULT_USER_STATE);
  });
});

describe('loadUserState', () => {
  const storageWith = (value: string | null) => ({ getItem: () => value });

  it('prázdné úložiště vrátí default', () => {
    expect(loadUserState(storageWith(null))).toEqual(DEFAULT_USER_STATE);
  });

  it('poškozený JSON vrátí default', () => {
    expect(loadUserState(storageWith('{nejson'))).toEqual(DEFAULT_USER_STATE);
  });

  it('JSON jiného tvaru nebo verze vrátí default', () => {
    expect(loadUserState(storageWith('[1,2]'))).toEqual(DEFAULT_USER_STATE);
    expect(loadUserState(storageWith('{"version":2}'))).toEqual(DEFAULT_USER_STATE);
  });

  it('chybějící pole doplní z defaultu', () => {
    const s = loadUserState(storageWith('{"version":1,"favorites":["a"]}'));
    expect(s.favorites).toEqual(['a']);
    expect(s.people).toEqual(DEFAULT_USER_STATE.people);
  });

  it('starší stav s poznámkami se načte bez nich a oblíbené zůstanou', () => {
    const s = loadUserState(storageWith('{"version":1,"favorites":["a"],"notes":{"a":"méně soli"}}'));
    expect(s.favorites).toEqual(['a']);
    expect('notes' in s).toBe(false);
    let stored = '';
    saveUserState({ setItem: (_k, v) => (stored = v) }, s);
    expect(stored).not.toContain('notes');
  });

  it('uložený stav s „uvařeno“ (fáze 4b–8) se načte bez něj, ostatní pole zůstanou a nové uložení ho neobsahuje', () => {
    const s = loadUserState(
      storageWith('{"version":1,"favorites":["a"],"cooked":["a","b"],"cart":[{"recipeId":"a","multiplier":2}]}'),
    );
    expect(s.favorites).toEqual(['a']);
    expect(s.cart).toEqual([{ recipeId: 'a', multiplier: 2 }]);
    expect('cooked' in s).toBe(false);
    let stored = '';
    saveUserState({ setItem: (_k, v) => (stored = v) }, s);
    expect(stored).not.toContain('cooked');
  });

  it('záloha nebo soubor serveru s „uvařeno“ projde parseUserState bez něj', () => {
    const s = parseUserState({ version: 1, favorites: ['x'], cooked: ['x'] });
    expect(s?.favorites).toEqual(['x']);
    expect(s && 'cooked' in s).toBe(false);
  });

  it('neplatné typy polí nahradí výchozími hodnotami', () => {
    const s = loadUserState(
      storageWith('{"version":1,"favorites":null,"cooked":{},"people":"x","cart":"y","settings":{"childCoef":"a"}}'),
    );
    expect(s).toEqual(DEFAULT_USER_STATE);
    expect(() => toggleFavorite(s, 'r1')).not.toThrow();
  });

  it('zachová platná pole vedle neplatných', () => {
    const s = loadUserState(storageWith('{"version":1,"favorites":["a",1],"dayFactor":1.2,"cooked":["b"]}'));
    expect(s.favorites).toEqual([]);
    expect(s.dayFactor).toBe(1.2);
    expect('cooked' in s).toBe(false);
  });

  it('vrácený default nesdílí referenci s DEFAULT_USER_STATE', () => {
    const s = loadUserState(storageWith(null));
    expect(s.favorites).not.toBe(DEFAULT_USER_STATE.favorites);
  });

  it('výjimka při čtení vrátí default', () => {
    const throwing = {
      getItem: () => {
        throw new Error('zakázáno');
      },
    };
    expect(loadUserState(throwing)).toEqual(DEFAULT_USER_STATE);
  });

  it('round-trip přes saveUserState', () => {
    let stored: string | null = null;
    const s = toggleFavorite(toggleFavorite(DEFAULT_USER_STATE, 'r9'), 'r8');
    saveUserState({ setItem: (_k, v) => (stored = v) }, s);
    expect(loadUserState(storageWith(stored))).toEqual(s);
  });
});

describe('saveUserState', () => {
  it('spolkne výjimku úložiště', () => {
    const throwing = {
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(() => saveUserState(throwing, DEFAULT_USER_STATE)).not.toThrow();
  });
});

describe('košík', () => {
  it('toggleCart přidá recept s násobkem 1 a podruhé ho odebere', () => {
    const s = toggleCart(DEFAULT_USER_STATE, 'a');
    expect(s.cart).toEqual([{ recipeId: 'a', multiplier: 1 }]);
    expect(isInCart(s, 'a')).toBe(true);
    expect(toggleCart(s, 'a').cart).toEqual([]);
    expect(DEFAULT_USER_STATE.cart).toEqual([]);
  });

  it('setCartMultiplier upne na celé číslo 1–10 a ostatní recepty nemění', () => {
    const s = toggleCart(toggleCart(DEFAULT_USER_STATE, 'a'), 'b');
    expect(setCartMultiplier(s, 'a', 3).cart).toEqual([{ recipeId: 'a', multiplier: 3 }, { recipeId: 'b', multiplier: 1 }]);
    expect(setCartMultiplier(s, 'a', 0).cart[0].multiplier).toBe(1);
    expect(setCartMultiplier(s, 'a', 2.6).cart[0].multiplier).toBe(3);
    expect(setCartMultiplier(s, 'a', 99).cart[0].multiplier).toBe(MULTIPLIER_MAX);
    expect(setCartMultiplier(s, 'neni', 3).cart).toEqual(s.cart);
  });

  it('removeFromCart odebere jen daný recept', () => {
    const s = toggleCart(toggleCart(DEFAULT_USER_STATE, 'a'), 'b');
    expect(removeFromCart(s, 'a').cart).toEqual([{ recipeId: 'b', multiplier: 1 }]);
  });
});

describe('osoby a náročnost dne', () => {
  it('setPeople: celá čísla 0–500 a vždy aspoň jedna osoba', () => {
    expect(setPeople(DEFAULT_USER_STATE, { adults: 6, children: 18 }).people).toEqual({ adults: 6, children: 18 });
    expect(setPeople(DEFAULT_USER_STATE, { adults: 0, children: 5 }).people).toEqual({ adults: 0, children: 5 });
    expect(setPeople(DEFAULT_USER_STATE, { adults: -3 }).people).toEqual({ adults: 1, children: 0 });
    expect(setPeople(DEFAULT_USER_STATE, { adults: Number.NaN }).people).toEqual({ adults: 1, children: 0 });
    expect(setPeople(DEFAULT_USER_STATE, { children: 600.4 }).people.children).toBe(PEOPLE_MAX);
    expect(setPeople(DEFAULT_USER_STATE, { children: 2.4 }).people.children).toBe(2);
  });

  it('setDayFactor: 0,8–1,3 po 0,05', () => {
    expect(setDayFactor(DEFAULT_USER_STATE, 1.17).dayFactor).toBe(1.15);
    expect(setDayFactor(DEFAULT_USER_STATE, 2).dayFactor).toBe(1.3);
    expect(setDayFactor(DEFAULT_USER_STATE, 0.5).dayFactor).toBe(0.8);
    expect(setDayFactor(DEFAULT_USER_STATE, Number.NaN).dayFactor).toBe(1);
  });
});

describe('updateSettings', () => {
  it('koeficient dítěte 0,3–1 po 0,05', () => {
    expect(updateSettings(DEFAULT_USER_STATE, { childCoef: 0.73 }).settings.childCoef).toBe(0.75);
    expect(updateSettings(DEFAULT_USER_STATE, { childCoef: 0.1 }).settings.childCoef).toBe(0.3);
  });

  it('cíl kcal 1000–6000 po 50, undefined = výchozí (klíč chybí)', () => {
    expect(updateSettings(DEFAULT_USER_STATE, { kcalTarget: 2512 }).settings.kcalTarget).toBe(2500);
    expect(updateSettings(DEFAULT_USER_STATE, { kcalTarget: 200 }).settings.kcalTarget).toBe(1000);
    const reset = updateSettings(updateSettings(DEFAULT_USER_STATE, { kcalTarget: 2000 }), { kcalTarget: undefined });
    expect('kcalTarget' in reset.settings).toBe(false);
  });

  it('historické suroviny se přepnou a ostatní nastavení zůstanou', () => {
    const s = updateSettings(DEFAULT_USER_STATE, { historicalIngredients: true });
    expect(s.settings).toEqual({ childCoef: 0.8, historicalIngredients: true });
  });
});

describe('loadUserState – meze', () => {
  const storageWith = (value: string | null) => ({ getItem: () => value });

  it('poškozený košík, osoby, náročnost a nastavení se upnou, duplicity v košíku sloučí', () => {
    const s = loadUserState(storageWith(JSON.stringify({
      version: 1,
      cart: [{ recipeId: 'a', multiplier: 0 }, { recipeId: 'a', multiplier: 5 }, { recipeId: 'b', multiplier: -2 }],
      people: { adults: 0, children: 0 },
      dayFactor: 9,
      settings: { childCoef: 5, historicalIngredients: true, kcalTarget: 99999 },
    })));
    expect(s.cart).toEqual([{ recipeId: 'a', multiplier: 1 }, { recipeId: 'b', multiplier: 1 }]);
    expect(s.people).toEqual({ adults: 1, children: 0 });
    expect(s.dayFactor).toBe(1.3);
    expect(s.settings).toEqual({ childCoef: 1, historicalIngredients: true, kcalTarget: KCAL_TARGET_MAX });
  });
});

describe('parseUserState', () => {
  it('platný objekt doplní chybějící pole, upne meze a zahodí neznámá pole', () => {
    const s = parseUserState({ version: 1, favorites: ['a'], cart: [{ recipeId: 'x', multiplier: 99 }], extra: 1 });
    expect(s).not.toBeNull();
    expect(s!.favorites).toEqual(['a']);
    expect(s!.cart).toEqual([{ recipeId: 'x', multiplier: MULTIPLIER_MAX }]);
    expect(s!.people).toEqual(DEFAULT_USER_STATE.people);
    expect('extra' in s!).toBe(false);
  });

  it('vrátí null pro data, která nejsou stav kuchařky', () => {
    for (const raw of [null, undefined, 'x', 42, [], {}, { favorites: ['a'] }, { version: 2 }, { version: '1' }]) {
      expect(parseUserState(raw)).toBeNull();
    }
  });

  it('výsledek nesdílí reference s DEFAULT_USER_STATE', () => {
    const s = parseUserState({ version: 1 })!;
    expect(s).toEqual(DEFAULT_USER_STATE);
    expect(s.cart).not.toBe(DEFAULT_USER_STATE.cart);
    expect(s.settings).not.toBe(DEFAULT_USER_STATE.settings);
  });
});

describe('vlastní recepty', () => {
  it('vlastní recept s kroky jako řetězce (stav z fáze 8) se načte, kroky jsou objekty', () => {
    const legacy = { ...customRecipe(), steps: ['Smíchej mouku s vejcem a solí.', 'Peč na pánvi dozlatova.'] };
    expect(validCustomRecipes([legacy])).toEqual([customRecipe()]);
  });

  const storageWith = (value: unknown) => ({ getItem: () => JSON.stringify(value) });

  it('platné se načtou, neplatné, cizí a duplicitní se zahodí s varováním', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ok = customRecipe();
    const s = loadUserState(storageWith({
      version: 1,
      favorites: ['a'],
      customRecipes: [ok, { id: 'rozbity' }, customRecipe({ id: 'vlastni-cizi-0001', baseServings: 4, source: { book: 'afrs-2003' } }), customRecipe()],
    }));
    expect(s.customRecipes).toEqual([ok]);
    expect(s.favorites).toEqual(['a']);
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });

  it('customRecipes jiného typu než pole → prázdné', () => {
    expect(loadUserState(storageWith({ version: 1, customRecipes: 'x' })).customRecipes).toEqual([]);
  });

  it('round-trip přes saveUserState zachová vlastní recept', () => {
    let stored = '';
    const s = upsertCustomRecipe(DEFAULT_USER_STATE, customRecipe());
    saveUserState({ setItem: (_k, v) => (stored = v) }, s);
    expect(loadUserState({ getItem: () => stored })).toEqual(s);
  });

  it('upsertCustomRecipe přidá nový na konec a existující nahradí na místě', () => {
    const a = customRecipe();
    const b = customRecipe({ id: 'vlastni-kase-0001', title: 'Kaše' });
    const s = upsertCustomRecipe(upsertCustomRecipe(DEFAULT_USER_STATE, a), b);
    expect(s.customRecipes.map((r) => r.id)).toEqual([OWN_ID, 'vlastni-kase-0001']);
    const edited = upsertCustomRecipe(s, { ...a, title: 'Lívance' });
    expect(edited.customRecipes.map((r) => r.title)).toEqual(['Lívance', 'Kaše']);
    expect(DEFAULT_USER_STATE.customRecipes).toEqual([]);
  });

  it('deleteCustomRecipe odebere recept i z košíku a oblíbených', () => {
    const s = toggleFavorite(toggleCart(upsertCustomRecipe(DEFAULT_USER_STATE, customRecipe()), OWN_ID), OWN_ID);
    const d = deleteCustomRecipe(toggleFavorite(s, 'brownies'), OWN_ID);
    expect(d.customRecipes).toEqual([]);
    expect(d.cart).toEqual([]);
    expect(d.favorites).toEqual(['brownies']);
  });

  it('importCustomRecipes: nové přidá, existující přepíše jen s overwrite', () => {
    const s = upsertCustomRecipe(DEFAULT_USER_STATE, customRecipe());
    const incoming = [customRecipe({ title: 'Z jiného zařízení' }), customRecipe({ id: 'vlastni-kase-0001', title: 'Kaše' })];
    expect(importCustomRecipes(s, incoming, false).customRecipes.map((r) => r.title)).toEqual(['Babiččiny lívance', 'Kaše']);
    expect(importCustomRecipes(s, incoming, true).customRecipes.map((r) => r.title)).toEqual(['Z jiného zařízení', 'Kaše']);
  });
});
