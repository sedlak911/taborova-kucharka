import { useId } from 'react'
import type { Ingredient, Recipe } from '@/domain/types'
import { downloadText, MAX_BACKUP_BYTES, readFileText } from '@/state/backup'
import { customRecipesFileName, parseCustomRecipesFile, serializeCustomRecipes, type ParsedImport } from './recipesFile'

interface Props {
  /** Vlastní recepty uživatele (`UserState.customRecipes`). */
  recipes: readonly Recipe[]
  ingredients: ReadonlyMap<string, Ingredient>
  /** Id knižních receptů (import je nesmí přepsat). */
  staticIds: ReadonlySet<string>
  onNewRecipe: () => void
  onImport: (recipes: Recipe[], overwrite: boolean) => void
  /**
   * Výsledek posledního importu. Drží ho rodič: import změní layout a kniha stránku na okamžik odmontuje
   * (`useHashRoute` ji najde znovu až v efektu), takže vlastní stav sekce by se ztratil.
   */
  message: string
  onMessage: (message: string) => void
  /** Datum do názvu exportu (v testech pevné). */
  now?: () => Date
}

function importSummary(parsed: ParsedImport, duplicates: number, overwrite: boolean): string {
  const parts = [`Přidáno: ${parsed.recipes.length - duplicates}`]
  if (duplicates > 0) parts.push(overwrite ? `přepsáno: ${duplicates}` : `přeskočeno (už v knize): ${duplicates}`)
  if (parsed.skipped.length > 0) {
    parts.push(`nenačteno: ${parsed.skipped.length} (${parsed.skipped.map((s) => `${s.label} – ${s.reason}`).join('; ')})`)
  }
  return `${parts.join(', ')}.`
}

/** Sekce tiráže „Vlastní recepty“: nový recept, export do JSON a import (ruling R11). */
export function CustomRecipesSettings({ recipes, ingredients, staticIds, onNewRecipe, onImport, message, onMessage, now = () => new Date() }: Props) {
  const headingId = useId()

  const importFile = async (file: File) => {
    if (file.size > MAX_BACKUP_BYTES) {
      onMessage('Soubor je příliš velký (nejvýš 1 MB).')
      return
    }
    let parsed: ParsedImport
    try {
      parsed = parseCustomRecipesFile(await readFileText(file), { ingredients, staticIds })
    } catch (e) {
      onMessage(e instanceof Error ? e.message : 'Soubor nejde načíst.')
      return
    }
    const existing = new Set(recipes.map((r) => r.id))
    const duplicates = parsed.recipes.filter((r) => existing.has(r.id))
    const overwrite =
      duplicates.length > 0 &&
      window.confirm(
        `${duplicates.length} z importovaných receptů už v knize je (${duplicates.map((r) => r.title).join(', ')}). Přepsat? OK = přepsat, Zrušit = ponechat současné.`,
      )
    if (parsed.recipes.length > 0) onImport(parsed.recipes, overwrite)
    onMessage(importSummary(parsed, duplicates.length, overwrite))
  }

  return (
    <section className="storage-panel" aria-labelledby={headingId}>
      <h3 id={headingId}>Vlastní recepty</h3>
      <p className="settings-hint">
        {recipes.length === 0 ? 'Zatím žádný vlastní recept.' : `Vlastní recepty v knize: ${recipes.length}.`} Export je soubor JSON ve formátu receptů
        knihy – záloha, nebo podklad pro přesun receptu do repozitáře (data/recipes).
      </p>
      <div className="storage-actions">
        <button type="button" className="cart-button" onClick={onNewRecipe}>
          Nový recept
        </button>
        <button
          type="button"
          className="cart-button"
          disabled={recipes.length === 0}
          onClick={() => downloadText(customRecipesFileName(now()), serializeCustomRecipes(recipes))}
        >
          Exportovat vlastní recepty (JSON)
        </button>
        <label className="cart-button storage-import">
          Importovat vlastní recepty
          <input
            type="file"
            accept="application/json,.json"
            className="visually-hidden"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0]
              e.currentTarget.value = '' // tentýž soubor jde vybrat znovu
              if (file) void importFile(file)
            }}
          />
        </label>
      </div>
      <p role="status" className="settings-hint">
        {message}
      </p>
    </section>
  )
}
