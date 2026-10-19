import { z } from 'zod';
import { DAY_FACTOR_MAX, DAY_FACTOR_MIN, DAY_FACTOR_STEP, type People } from '../domain/portions';
import { DEFAULT_CHILD_COEF } from '../domain/scaling';
import { RecipeSchema } from '../domain/schema';
import type { Recipe } from '../domain/types';

/** Klíč v localStorage; verze v klíči umožní pozdější migraci. */
export const STORAGE_KEY = 'kucharka.userState.v1';

export interface UserState {
  version: 1;
  people: { adults: number; children: number };
  dayFactor: number;
  cart: { recipeId: string; multiplier: number }[];
  favorites: string[];
  /** Vlastní recepty (spec §5.2): `Recipe` s `source.book = 'vlastni'`, validované při načtení. */
  customRecipes: Recipe[];
  settings: { childCoef: number; kcalTarget?: number; historicalIngredients: boolean };
}

export const DEFAULT_USER_STATE: UserState = {
  version: 1,
  people: { adults: 2, children: 0 },
  dayFactor: 1,
  cart: [],
  favorites: [],
  customRecipes: [],
  settings: { childCoef: DEFAULT_CHILD_COEF, historicalIngredients: false },
};

const num = z.number().finite();

/**
 * Tolerantní schéma: každé neplatné nebo chybějící pole se nahradí výchozí hodnotou.
 * Neznámá pole z.object zahodí: `notes` (fáze 4) i `cooked` („uvařeno“ fází 4b–8, zrušeno v R2).
 */
const userStateSchema = z.object({
  version: z.literal(1),
  people: z
    .object({
      adults: num.catch(DEFAULT_USER_STATE.people.adults),
      children: num.catch(DEFAULT_USER_STATE.people.children),
    })
    .catch({ ...DEFAULT_USER_STATE.people }),
  dayFactor: num.catch(DEFAULT_USER_STATE.dayFactor),
  cart: z
    .array(z.object({ recipeId: z.string(), multiplier: num }))
    .catch([]),
  favorites: z.array(z.string()).catch([]),
  customRecipes: z.array(z.unknown()).catch([]),
  settings: z
    .object({
      childCoef: num.catch(DEFAULT_USER_STATE.settings.childCoef),
      kcalTarget: num.optional().catch(undefined),
      historicalIngredients: z.boolean().catch(DEFAULT_USER_STATE.settings.historicalIngredients),
    })
    .catch({ ...DEFAULT_USER_STATE.settings }),
});

type ParsedUserState = z.infer<typeof userStateSchema>;

/** Vlastní recepty z úložiště: neplatné (schéma, cizí kniha, duplicitní id) se zahodí s varováním (ruling R5). */
export function validCustomRecipes(raw: readonly unknown[]): Recipe[] {
  const out: Recipe[] = [];
  raw.forEach((item, i) => {
    const parsed = RecipeSchema.safeParse(item);
    if (!parsed.success) {
      console.warn(`Vlastní recept č. ${i + 1} neodpovídá schématu a byl zahozen.`, parsed.error.issues);
      return;
    }
    if (parsed.data.source.book !== 'vlastni') {
      console.warn(`Vlastní recept „${parsed.data.title}“ nemá source.book „vlastni“ a byl zahozen.`);
      return;
    }
    if (out.some((r) => r.id === parsed.data.id)) {
      console.warn(`Vlastní recept „${parsed.data.id}“ je uložený dvakrát, ponechán první.`);
      return;
    }
    out.push(parsed.data);
  });
  return out;
}

function freshDefault(): UserState {
  return structuredClone(DEFAULT_USER_STATE);
}

/** Čtení a zápis klíče (localStorage nebo náhrada v paměti) – bez DOM typů, modul načítá i Node server. */
export interface KeyValueReader {
  getItem(key: string): string | null;
}
export interface KeyValueWriter {
  setItem(key: string, value: string): void;
}

/**
 * Jediná validace stavu z neznámého zdroje (localStorage, soubor serveru, importovaná záloha).
 * null = nejde o stav kuchařky (ne objekt, chybí `version: 1`); jinak se pole tolerantně opraví.
 */
export function parseUserState(raw: unknown): UserState | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  if ((raw as { version?: unknown }).version !== 1) return null;
  // Chybějící klíče doplníme výchozími, aby je `.catch` zachytilo jednotně.
  const result = userStateSchema.safeParse({ ...freshDefault(), ...(raw as Record<string, unknown>) });
  return result.success ? sanitize(result.data) : null;
}

/** Načte stav; chybějící, neplatný nebo poškozený obsah nahradí výchozími hodnotami (po polích). */
export function loadUserState(storage: KeyValueReader): UserState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw == null) return freshDefault();
    return parseUserState(JSON.parse(raw)) ?? freshDefault();
  } catch {
    return freshDefault();
  }
}

/** Uloží stav; chyby úložiště (soukromý režim, plná kvóta) tiše ignoruje. */
export function saveUserState(storage: KeyValueWriter, s: UserState): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // úložiště nedostupné – stav zůstane jen v paměti
  }
}

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function toggleFavorite(s: UserState, recipeId: string): UserState {
  return { ...s, favorites: toggleId(s.favorites, recipeId) };
}

export const MULTIPLIER_MAX = 10;
export const PEOPLE_MAX = 500;
export const CHILD_COEF_MIN = 0.3;
export const CHILD_COEF_MAX = 1;
export const KCAL_TARGET_MIN = 1000;
export const KCAL_TARGET_MAX = 6000;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
/** Na krok a dvě desetinná místa (bez binárního šumu 1.1500000000000001). */
const toStep = (v: number, step: number) => Number((Math.round(v / step) * step).toFixed(2));
const count = (v: number) => (Number.isFinite(v) ? clamp(Math.round(v), 0, PEOPLE_MAX) : 0);

/** Celá čísla 0–500; když by nezbyla žádná osoba, je to jeden dospělý (P nesmí být 0). */
export function clampPeople(p: People): People {
  const adults = count(p.adults);
  const children = count(p.children);
  return adults + children === 0 ? { adults: 1, children: 0 } : { adults, children };
}

export function clampDayFactor(v: number): number {
  return Number.isFinite(v) ? clamp(toStep(v, DAY_FACTOR_STEP), DAY_FACTOR_MIN, DAY_FACTOR_MAX) : 1;
}

export function clampMultiplier(v: number): number {
  return Number.isFinite(v) ? clamp(Math.round(v), 1, MULTIPLIER_MAX) : 1;
}

function clampChildCoef(v: number): number {
  return Number.isFinite(v) ? clamp(toStep(v, 0.05), CHILD_COEF_MIN, CHILD_COEF_MAX) : DEFAULT_CHILD_COEF;
}

function clampKcalTarget(v: number | undefined): number | undefined {
  if (v === undefined || !Number.isFinite(v)) return undefined;
  return clamp(Math.round(v / 50) * 50, KCAL_TARGET_MIN, KCAL_TARGET_MAX);
}

export function isInCart(s: UserState, recipeId: string): boolean {
  return s.cart.some((e) => e.recipeId === recipeId);
}

export function toggleCart(s: UserState, recipeId: string): UserState {
  return isInCart(s, recipeId)
    ? { ...s, cart: s.cart.filter((e) => e.recipeId !== recipeId) }
    : { ...s, cart: [...s.cart, { recipeId, multiplier: 1 }] };
}

export function setCartMultiplier(s: UserState, recipeId: string, multiplier: number): UserState {
  return { ...s, cart: s.cart.map((e) => (e.recipeId === recipeId ? { ...e, multiplier: clampMultiplier(multiplier) } : e)) };
}

export function removeFromCart(s: UserState, recipeId: string): UserState {
  return { ...s, cart: s.cart.filter((e) => e.recipeId !== recipeId) };
}

/** Nový vlastní recept na konec, existující (stejné id) nahradí na místě. */
export function upsertCustomRecipe(s: UserState, recipe: Recipe): UserState {
  const exists = s.customRecipes.some((r) => r.id === recipe.id);
  return {
    ...s,
    customRecipes: exists ? s.customRecipes.map((r) => (r.id === recipe.id ? recipe : r)) : [...s.customRecipes, recipe],
  };
}

/** Smaže vlastní recept a všechny odkazy na něj (košík, oblíbené) – ruling R10 fáze 8. */
export function deleteCustomRecipe(s: UserState, id: string): UserState {
  return {
    ...s,
    customRecipes: s.customRecipes.filter((r) => r.id !== id),
    cart: s.cart.filter((e) => e.recipeId !== id),
    favorites: s.favorites.filter((x) => x !== id),
  };
}

/** Import: nové recepty přidá, existující id přepíše jen s `overwrite` (ruling R11). */
export function importCustomRecipes(s: UserState, recipes: readonly Recipe[], overwrite: boolean): UserState {
  let next = s;
  for (const r of recipes) {
    if (!overwrite && next.customRecipes.some((x) => x.id === r.id)) continue;
    next = upsertCustomRecipe(next, r);
  }
  return next;
}

export function setPeople(s: UserState, patch: Partial<People>): UserState {
  return { ...s, people: clampPeople({ ...s.people, ...patch }) };
}

export function setDayFactor(s: UserState, value: number): UserState {
  return { ...s, dayFactor: clampDayFactor(value) };
}

/** `kcalTarget: undefined` vrací výchozí cíl (klíč se odstraní). */
export function updateSettings(s: UserState, patch: Partial<UserState['settings']>): UserState {
  const next = { ...s.settings, ...patch };
  const settings: UserState['settings'] = {
    childCoef: clampChildCoef(next.childCoef),
    historicalIngredients: next.historicalIngredients,
  };
  const kcalTarget = clampKcalTarget(next.kcalTarget);
  return { ...s, settings: kcalTarget === undefined ? settings : { ...settings, kcalTarget } };
}

/** Meze a deduplikace pro stav načtený z úložiště (ručně upravený nebo starý JSON); vlastní recepty se validují. */
function sanitize(s: ParsedUserState): UserState {
  const cart: UserState['cart'] = [];
  for (const e of s.cart) {
    if (cart.some((c) => c.recipeId === e.recipeId)) continue; // duplicita: první vyhrává
    cart.push({ recipeId: e.recipeId, multiplier: clampMultiplier(e.multiplier) });
  }
  return updateSettings(
    { ...s, cart, people: clampPeople(s.people), dayFactor: clampDayFactor(s.dayFactor), customRecipes: validCustomRecipes(s.customRecipes) },
    {},
  );
}
