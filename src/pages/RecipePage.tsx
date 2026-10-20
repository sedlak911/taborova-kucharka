import { BOOK_META } from '@/content/books'
import { recipeMacrosPerServing } from '@/domain/nutrition'
import type { Portions } from '@/domain/portions'
import { currentStepIndex, stepTimeline } from '@/domain/steps'
import type { Ingredient, Recipe } from '@/domain/types'
import { IngredientTable } from './IngredientTable'
import { ALLERGEN_LABEL, DIFFICULTY_LABEL, EQUIPMENT_LABEL, difficultyDots } from './labels'
import { NutritionFacts } from './NutritionFacts'
import { Divider } from './ornaments'
import { RecipeMarks } from './RecipeMarks'
import { bookLabel, originalTitle, sourceLine } from './recipeText'
import { StepStopwatch } from './StepStopwatch'
import { StepTime, StepsTotal } from './StepTime'
import { useStopwatch } from './useStopwatch'

const eraClass = (recipe: Recipe) => `era--${BOOK_META[recipe.source.book].era}`

interface InfoProps {
  recipe: Recipe
  ingredients: Map<string, Ingredient>
  portions: Portions
  historical: boolean
  /** Vlastní recept: otevře formulář úpravy. */
  onEdit?: () => void
  /** Vlastní recept: smaže ho po potvrzení. */
  onDelete?: () => void
}

interface ActionsProps {
  favorite: boolean
  inCart: boolean
  onToggleFavorite: () => void
  onToggleCart: () => void
}

/** Údaje a nákup („vlevo informace + nákup“): název, původní název, Upravit/Smazat, údaje, suroviny, nutrice. */
function RecipeInfo({ recipe, ingredients, portions, historical, onEdit, onDelete }: InfoProps) {
  const original = originalTitle(recipe)
  const book = bookLabel(recipe)
  return (
    <>
      <header className="recipe-head">
        {/* číslo receptury ze zdroje: epocha ho může ukázat před názvem (Receptury 1983: „11002 — …“) */}
        <h2 data-code={recipe.source.code}>{recipe.title}</h2>
      </header>
      {original && <small className="recipe-original-title">{original}</small>}
      {(onEdit || onDelete) && (
        <div className="recipe-own-actions">
          {onEdit && (
            <button type="button" className="recipe-own-button" onClick={onEdit}>
              Upravit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="recipe-own-button"
              onClick={() => {
                if (window.confirm(`Smazat recept „${recipe.title}“? Zmizí i z košíku a oblíbených.`)) onDelete()
              }}
            >
              Smazat
            </button>
          )}
        </div>
      )}
      <dl className="recipe-meta">
        <div><dt>Kniha</dt><dd className="recipe-book">{book}</dd></div>
        <div><dt>Čas</dt><dd>{recipe.timeMinutes} min</dd></div>
        <div>
          <dt>Obtížnost</dt>
          <dd><span aria-hidden="true">{difficultyDots(recipe.difficulty)}</span> {DIFFICULTY_LABEL[recipe.difficulty]}</dd>
        </div>
        <div><dt>Vybavení</dt><dd>{recipe.equipment.length ? recipe.equipment.map((e) => EQUIPMENT_LABEL[e]).join(', ') : '—'}</dd></div>
        <div><dt>Alergeny</dt><dd>{recipe.allergens.length ? recipe.allergens.map((a) => ALLERGEN_LABEL[a]).join(', ') : 'bez alergenů'}</dd></div>
      </dl>
      <IngredientTable recipe={recipe} ingredients={ingredients} portions={portions} historical={historical} perPerson />
      <NutritionFacts macros={recipeMacrosPerServing(recipe, ingredients, historical)} />
    </>
  )
}

/** Postup („vpravo postup“): volitelné živé záhlaví, postup se značkami stopek, „Hotovo“, poznámka, patička zdroje. */
function RecipeMethod({ recipe, runningHead }: { recipe: Recipe; runningHead: boolean }) {
  const timeline = stepTimeline(recipe.steps)
  // recept bez jediného času vypadá jako dřív – žádné „0:00“ u všech kroků (ruling R4)
  const timed = timeline.total > 0
  const stopwatch = useStopwatch(recipe.id)
  const started = stopwatch.running || stopwatch.elapsedSeconds > 0
  const current = timed && started ? currentStepIndex(recipe.steps, stopwatch.elapsedSeconds) : null
  return (
    <>
      {runningHead && <h2 className="recipe-running-head">{recipe.title}</h2>}
      <h3>{BOOK_META[recipe.source.book].headings?.steps ?? 'Postup'}</h3>
      {timed && (
        <StepStopwatch
          elapsedSeconds={stopwatch.elapsedSeconds}
          running={stopwatch.running}
          onStart={stopwatch.start}
          onPause={stopwatch.pause}
          onReset={stopwatch.reset}
        />
      )}
      <ol className="recipe-steps">
        {recipe.steps.map((s, i) => (
          <li key={i} className={i === current ? 'is-current' : undefined} aria-current={i === current ? 'step' : undefined}>
            {timed && <StepTime start={timeline.steps[i].startMinutes} />}
            {s.text}
          </li>
        ))}
      </ol>
      {timed && <StepsTotal total={timeline.total} className="recipe-steps-total" />}
      {recipe.modernNote && (
        <aside className="modern-note">
          <strong>{recipe.source.book === 'vlastni' || recipe.source.book === 'overene' ? 'Poznámka' : 'Poznámka k modernizaci'}</strong>
          <p>{recipe.modernNote}</p>
        </aside>
      )}
      <footer className="source">{sourceLine(recipe)}</footer>
    </>
  )
}

/** Funkční tlačítka receptu (srdíčko, košík) v samostatném řádku bez nadpisu – nezasahují do názvu (spec §2 [R2]). */
function RecipeActions({ favorite, inCart, onToggleFavorite, onToggleCart }: ActionsProps) {
  return (
    <div className="recipe-actions">
      <RecipeMarks favorite={favorite} onToggleFavorite={onToggleFavorite} inCart={inCart} onToggleCart={onToggleCart} />
    </div>
  )
}

/** Levá strana dvoustrany: údaje a suroviny, bez funkčních tlačítek (kromě Upravit/Smazat vlastního receptu). */
export function RecipeLeft(props: InfoProps) {
  return (
    <article className={`recipe-page recipe-page--left ${eraClass(props.recipe)}`}>
      <RecipeInfo {...props} />
    </article>
  )
}

/** Pravá strana dvoustrany: srdíčko a košík nahoře (tady není nadpis), pak postup. */
export function RecipeRight({ recipe, ...actions }: { recipe: Recipe } & ActionsProps) {
  return (
    <article className={`recipe-page recipe-page--right ${eraClass(recipe)}`}>
      <RecipeActions {...actions} />
      <RecipeMethod recipe={recipe} runningHead />
    </article>
  )
}

/** Mobil: celý recept na jedné scrollovatelné stránce – tlačítka, údaje a suroviny, ornament, postup. */
export function RecipeSingle({ favorite, inCart, onToggleFavorite, onToggleCart, ...info }: InfoProps & ActionsProps) {
  return (
    <article className={`recipe-page recipe-page--single ${eraClass(info.recipe)}`}>
      <RecipeActions favorite={favorite} inCart={inCart} onToggleFavorite={onToggleFavorite} onToggleCart={onToggleCart} />
      <RecipeInfo {...info} />
      <Divider />
      <RecipeMethod recipe={info.recipe} runningHead={false} />
    </article>
  )
}
