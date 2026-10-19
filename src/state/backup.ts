import { parseUserState } from './userState';
import type { UserState } from './userState';

/** Stejný limit jako tělo PUT na serveru (MAX_BODY_BYTES ve scripts/serve.ts). */
export const MAX_BACKUP_BYTES = 1_000_000;

const pad = (n: number) => String(n).padStart(2, '0');

export function backupFileName(date: Date): string {
  return `kucharka-data-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

/** Záloha = přesně UserState, stejný formát jako userdata/user-state.json (ruling R8). */
export function serializeBackup(state: UserState): string {
  return `${JSON.stringify(state, null, 2)}\n`;
}

export type BackupResult = { ok: true; state: UserState } | { ok: false; error: string };

export function parseBackup(text: string): BackupResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Soubor není platný JSON.' };
  }
  const state = parseUserState(raw);
  return state ? { ok: true, state } : { ok: false, error: 'Soubor není záloha kuchařky (chybí „version“: 1).' };
}

export function backupSummary(s: UserState): string {
  return `oblíbené: ${s.favorites.length} · v košíku: ${s.cart.length} · dospělí: ${s.people.adults} · děti: ${s.people.children} · vlastní recepty: ${s.customRecipes.length}`;
}

export function readFileText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Soubor nejde přečíst.'));
    reader.readAsText(file, 'utf-8');
  });
}

/** Stažení textu jako souboru (bez serveru): Blob + dočasný odkaz s atributem download. */
export function downloadText(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Safari potřebuje URL ještě chvíli po kliknutí
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
