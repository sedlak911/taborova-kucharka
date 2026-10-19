import { afterEach, describe, expect, it, vi } from 'vitest';
import { backupFileName, backupSummary, downloadText, parseBackup, readFileText, serializeBackup } from './backup';
import { customRecipe } from '@/test/customRecipe';
import { DEFAULT_USER_STATE, toggleCart, toggleFavorite } from './userState';

describe('backupFileName', () => {
  it('místní datum s nulami', () => {
    expect(backupFileName(new Date(2026, 9, 15, 23, 59))).toBe('kucharka-data-2026-10-15.json');
    expect(backupFileName(new Date(2027, 0, 5))).toBe('kucharka-data-2027-01-05.json');
  });
});

describe('serializeBackup + parseBackup', () => {
  it('round-trip vrátí stejný stav', () => {
    const s = toggleCart(toggleFavorite(DEFAULT_USER_STATE, 'a'), 'b');
    const text = serializeBackup(s);
    expect(text.endsWith('}\n')).toBe(true);
    expect(text).toContain('\n  "version": 1');
    expect(parseBackup(text)).toEqual({ ok: true, state: s });
  });

  it('ne-JSON a cizí JSON odmítne s českou hláškou', () => {
    expect(parseBackup('{nejson')).toEqual({ ok: false, error: 'Soubor není platný JSON.' });
    for (const text of ['{"foo":1}', '[1,2]', '{"version":2}', 'null']) {
      expect(parseBackup(text)).toEqual({ ok: false, error: 'Soubor není záloha kuchařky (chybí „version“: 1).' });
    }
  });
});

describe('backupSummary', () => {
  it('shrne obsah zálohy', () => {
    const s = toggleCart(toggleFavorite(toggleFavorite(DEFAULT_USER_STATE, 'a'), 'b'), 'c');
    expect(backupSummary(s)).toBe('oblíbené: 2 · v košíku: 1 · dospělí: 2 · děti: 0 · vlastní recepty: 0');
  });

  it('uvádí počet vlastních receptů, aby import zálohy nepřepsal recepty mlčky', () => {
    const s = { ...DEFAULT_USER_STATE, customRecipes: [customRecipe(), customRecipe({ id: 'vlastni-kase-0001' })] };
    expect(backupSummary(s)).toContain('vlastní recepty: 2');
  });
});

describe('readFileText', () => {
  it('přečte soubor jako UTF-8', async () => {
    await expect(readFileText(new File(['{"a":"č"}'], 'x.json', { type: 'application/json' }))).resolves.toBe('{"a":"č"}');
  });
});

describe('downloadText', () => {
  afterEach(() => vi.restoreAllMocks());

  it('stáhne Blob přes dočasný odkaz s atributem download a odkaz uklidí', async () => {
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => {
      blob = b;
      return 'blob:test';
    });
    URL.revokeObjectURL = vi.fn();
    let clicked: { href: string; download: string; inDom: boolean } | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked = { href: this.href, download: this.download, inDom: document.body.contains(this) };
    });
    downloadText('kucharka-data-2026-10-15.json', '{"version":1}');
    expect(clicked).toEqual({ href: 'blob:test', download: 'kucharka-data-2026-10-15.json', inDom: true });
    expect(document.querySelector('a[download]')).toBeNull();
    expect(blob?.type).toBe('application/json');
    await expect(readFileText(blob!)).resolves.toBe('{"version":1}');
  });
});
