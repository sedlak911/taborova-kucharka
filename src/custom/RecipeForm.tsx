// src/custom/RecipeForm.tsx
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { CHAPTER_META } from '@/content/chapters'
import { CHAPTERS, EQUIPMENT, UNITS } from '@/domain/schema'
import type { Chapter, Ingredient, Recipe, Unit } from '@/domain/types'
import { DIFFICULTY_LABEL, EQUIPMENT_LABEL, TAG_LABEL, UNIT_LABEL } from '@/pages/labels'
import { FORM_TAGS, STEPS_HINT, STEPS_PLACEHOLDER, TITLE_MAX, draftFromRecipe, draftToRecipe, emptyDraft, lineErrorKey, newLine, type DraftErrors, type DraftLine, type RecipeDraft } from './draft'
import { IngredientPicker } from './IngredientPicker'

interface Props {
  ingredients: Map<string, Ingredient>
  /** Upravovaný vlastní recept; bez něj se zakládá nový. */
  recipe?: Recipe
  /** Kapitola předvyplněná u nového receptu (stránka, ze které se formulář otevřel). */
  defaultChapter?: Chapter
  /** Id nového receptu z názvu (App zná obsazená id). */
  makeId: (title: string) => string
  onSave: (recipe: Recipe) => void
  onCancel: () => void
  /** Hlásí, zda je formulář rozepsaný (stejná podmínka jako dotaz při Escape/Zrušit). */
  onDirtyChange?: (dirty: boolean) => void
  /** Prvek, který formulář otevřel; po zavření na něj jde fokus (App ho uloží dřív, než je `main` inert). */
  returnFocusTo?: Element | null
}

const LINE_FIELDS = ['ingredientId', 'amount', 'unit'] as const

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

/** Formulář vlastního receptu: dialog nad knihou, vypadá jako vložený ručně psaný list (spec §2, ruling R7). */
export function RecipeForm({ ingredients, recipe, defaultChapter, makeId, onSave, onCancel, onDirtyChange, returnFocusTo }: Props) {
  const [initial] = useState<RecipeDraft>(() => (recipe ? draftFromRecipe(recipe, ingredients) : emptyDraft(defaultChapter)))
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<DraftErrors>({})
  const formRef = useRef<HTMLFormElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const addRef = useRef<HTMLButtonElement>(null)
  // id prvku, na který jde fokus po odebrání řádku (odmontované tlačítko by ho jinak shodilo na body)
  const focusAfterRemove = useRef<string | null | undefined>(undefined)
  const uid = useId()
  const fid = (name: string) => `${uid}-${name}`
  const errId = (key: string) => `${uid}-chyba-${key}`
  const errorRef = (key: string) => (errors[key] ? errId(key) : undefined)
  // funkce, ne komponenta: při překreslení se nic neodmontuje; `key` kvůli řádkovým chybám vykreslovaným přes map
  const errorText = (key: string) =>
    errors[key] ? (
      <p key={key} id={errId(key)} className="recipe-form__error">
        {errors[key]}
      </p>
    ) : null
  const list = useMemo(() => [...ingredients.values()], [ingredients])

  // fokus do názvu; po zavření zpět na prvek, který formulář otevřel
  const opener = useRef(returnFocusTo)
  useEffect(() => {
    titleRef.current?.focus()
    const target = opener.current
    return () => {
      if (target instanceof HTMLElement && target.isConnected) target.focus()
    }
  }, [])

  useEffect(() => {
    const target = focusAfterRemove.current
    if (target === undefined) return
    focusAfterRemove.current = undefined
    const el = target ? document.getElementById(target) : addRef.current
    el?.focus()
  }, [draft.lines])

  // po neúspěšném uložení fokus na první chybné pole
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [errors])

  const set = (patch: Partial<RecipeDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const setLine = (key: string, patch: Partial<DraftLine>) =>
    setDraft((d) => ({ ...d, lines: d.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) }))

  const removeLine = (key: string) => {
    const i = draft.lines.findIndex((l) => l.key === key)
    const neighbour = draft.lines[i + 1] ?? draft.lines[i - 1]
    focusAfterRemove.current = neighbour ? fid(`surovina-${neighbour.key}`) : null
    set({ lines: draft.lines.filter((l) => l.key !== key) })
  }

  const dirty = draft !== initial
  useEffect(() => {
    onDirtyChange?.(dirty)
    return () => onDirtyChange?.(false) // zavřený formulář už není rozepsaný
  }, [dirty, onDirtyChange])

  const cancel = () => {
    if (!dirty || window.confirm('Zahodit rozepsaný recept?')) onCancel()
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    // id nového receptu se losuje až po úspěšné validaci; při ověření stačí zástupné
    const result = draftToRecipe(draft, { id: recipe?.id ?? 'vlastni-novy', ingredients })
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    onSave(recipe ? result.recipe : { ...result.recipe, id: makeId(result.recipe.title) })
  }

  const invalid = (key: string) => (errors[key] ? true : undefined)

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="recipe-form-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={fid('nadpis')}
      // tabIndex -1: klik na pozadí nebo text listu nechá fokus v dialogu (nejbližší fokusovatelný předek), aby fungoval Escape
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return
        e.stopPropagation()
        cancel()
      }}
    >
      <form ref={formRef} className="recipe-form" noValidate onSubmit={submit}>
        <h2 id={fid('nadpis')} className="recipe-form__title">
          {recipe ? 'Upravit recept' : 'Nový recept'}
        </h2>
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="recipe-form__error recipe-form__summary">
            Recept zatím nejde uložit – oprav označená pole.
          </p>
        )}

        <div className="recipe-form__field">
          <label htmlFor={fid('nazev')}>Název</label>
          <input
            ref={titleRef}
            id={fid('nazev')}
            type="text"
            maxLength={TITLE_MAX}
            value={draft.title}
            aria-invalid={invalid('title')}
            aria-describedby={errorRef('title')}
            onChange={(e) => set({ title: e.currentTarget.value })}
          />
          {errorText('title')}
        </div>

        <div className="recipe-form__row">
          <div className="recipe-form__field">
            <label htmlFor={fid('kapitola')}>Kapitola</label>
            <select id={fid('kapitola')} value={draft.chapter} onChange={(e) => set({ chapter: e.currentTarget.value as Chapter })}>
              {CHAPTERS.map((c) => (
                <option key={c} value={c}>
                  {CHAPTER_META[c].title}
                </option>
              ))}
            </select>
          </div>
          <div className="recipe-form__field">
            <label htmlFor={fid('porce')}>Pro kolik porcí je recept napsaný</label>
            <input
              id={fid('porce')}
              type="text"
              inputMode="numeric"
              value={draft.baseServings}
              aria-invalid={invalid('baseServings')}
              aria-describedby={errorRef('baseServings')}
              onChange={(e) => set({ baseServings: e.currentTarget.value })}
            />
            {errorText('baseServings')}
          </div>
          <div className="recipe-form__field">
            <label htmlFor={fid('cas')}>Čas (minuty)</label>
            <input
              id={fid('cas')}
              type="text"
              inputMode="numeric"
              value={draft.timeMinutes}
              aria-invalid={invalid('timeMinutes')}
              aria-describedby={errorRef('timeMinutes')}
              onChange={(e) => set({ timeMinutes: e.currentTarget.value })}
            />
            {errorText('timeMinutes')}
          </div>
        </div>

        <fieldset className="recipe-form__checks">
          <legend>Obtížnost</legend>
          {([1, 2, 3] as const).map((d) => (
            <label key={d}>
              <input type="radio" name={fid('obtiznost')} checked={draft.difficulty === d} onChange={() => set({ difficulty: d })} /> {DIFFICULTY_LABEL[d]}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Suroviny</legend>
          <ol className="recipe-form__lines">
            {draft.lines.map((line, i) => {
              const n = i + 1
              const key = (field: (typeof LINE_FIELDS)[number]) => lineErrorKey(line.key, field)
              // chyba „přidej aspoň jednu surovinu“ se váže k prvnímu řádku
              const listError = i === 0 && errors.lines !== undefined
              return (
                <li key={line.key} className="recipe-form__line">
                  <IngredientPicker
                    id={fid(`surovina-${line.key}`)}
                    label={`Surovina ${n}`}
                    ingredients={list}
                    query={line.query}
                    selectedId={line.ingredientId}
                    invalid={Boolean(errors[key('ingredientId')]) || listError}
                    describedBy={errorRef(key('ingredientId')) ?? (listError ? errId('lines') : undefined)}
                    onChange={(query, ingredientId) => setLine(line.key, { query, ingredientId })}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    className="recipe-form__amount"
                    aria-label={`Množství ${n}`}
                    placeholder="množství"
                    value={line.unit === 'spetka' ? '1' : line.amount}
                    disabled={line.unit === 'spetka'}
                    aria-invalid={invalid(key('amount'))}
                    aria-describedby={errorRef(key('amount'))}
                    onChange={(e) => setLine(line.key, { amount: e.currentTarget.value })}
                  />
                  <select
                    aria-label={`Jednotka ${n}`}
                    value={line.unit}
                    aria-invalid={invalid(key('unit'))}
                    aria-describedby={errorRef(key('unit'))}
                    onChange={(e) => setLine(line.key, { unit: e.currentTarget.value as Unit })}
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {UNIT_LABEL[u]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="recipe-form__remove"
                    aria-label={`Odebrat surovinu ${n}`}
                    onClick={() => removeLine(line.key)}
                  >
                    ×
                  </button>
                  <input
                    type="text"
                    className="recipe-form__line-note"
                    aria-label={`Poznámka ${n}`}
                    placeholder="poznámka, např. nakrájená"
                    value={line.note}
                    onChange={(e) => setLine(line.key, { note: e.currentTarget.value })}
                  />
                  {LINE_FIELDS.map((f) => errorText(key(f)))}
                </li>
              )
            })}
          </ol>
          <button ref={addRef} type="button" className="recipe-form__add" onClick={() => set({ lines: [...draft.lines, newLine()] })}>
            + Přidat surovinu
          </button>
          {errorText('lines')}
        </fieldset>

        <div className="recipe-form__field">
          <label htmlFor={fid('postup')}>Postup (každý krok na nový řádek)</label>
          <textarea
            id={fid('postup')}
            rows={6}
            value={draft.steps}
            aria-invalid={invalid('steps')}
            placeholder={STEPS_PLACEHOLDER}
            aria-describedby={[errorRef('steps'), fid('postup-napoveda')].filter(Boolean).join(' ')}
            onChange={(e) => set({ steps: e.currentTarget.value })}
          />
          <p id={fid('postup-napoveda')} className="recipe-form__hint">
            {STEPS_HINT}
          </p>
          {errorText('steps')}
        </div>

        <fieldset className="recipe-form__checks">
          <legend>Štítky</legend>
          {FORM_TAGS.map((t) => (
            <label key={t}>
              <input type="checkbox" checked={draft.tags.includes(t)} onChange={() => set({ tags: toggle(draft.tags, t) })} /> {TAG_LABEL[t]}
            </label>
          ))}
        </fieldset>

        <fieldset className="recipe-form__checks">
          <legend>Vybavení</legend>
          {EQUIPMENT.map((eq) => (
            <label key={eq}>
              <input type="checkbox" checked={draft.equipment.includes(eq)} onChange={() => set({ equipment: toggle(draft.equipment, eq) })} /> {EQUIPMENT_LABEL[eq]}
            </label>
          ))}
        </fieldset>

        <div className="recipe-form__field">
          <label htmlFor={fid('poznamka')}>Poznámka (nepovinná)</label>
          <textarea id={fid('poznamka')} rows={3} value={draft.note} onChange={(e) => set({ note: e.currentTarget.value })} />
        </div>

        <div className="recipe-form__actions">
          <button type="button" className="recipe-form__cancel" onClick={cancel}>
            Zrušit
          </button>
          <button type="submit" className="recipe-form__save">
            Uložit recept
          </button>
        </div>
      </form>
    </div>
  )
}
