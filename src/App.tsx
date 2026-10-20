import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Book, type BookPageDef } from '@/book/Book'
import { useViewMode } from '@/book/useViewMode'
import { buildLayout, hiddenPages, type PageEntry } from '@/content/buildPages'
import { BOOK_META } from '@/content/books'
import { CHAPTER_META } from '@/content/chapters'
import { isCustomRecipe, mergeRecipes, newCustomRecipeId } from '@/content/customRecipes'
import { loadContent } from '@/content/loadContent'
import { EMPTY_FILTER, filterRecipes, isFilterActive, tocPageCount, type Filter, type TocMetrics } from '@/content/search'
import { Bookmark } from '@/app/Bookmark'
import { BookControls } from '@/app/BookControls'
import { editorRouteFromHash, indexToRoute, routeToHash, routeToIndex, type EditorRoute, type Route } from '@/app/route'
import { useHashRoute } from '@/app/useHashRoute'
import { CustomRecipesSettings } from '@/custom/CustomRecipesSettings'
import { RecipeForm } from '@/custom/RecipeForm'
import type { Recipe } from '@/domain/types'
import { persons, type Portions } from '@/domain/portions'
import { buildShoppingList } from '@/domain/shopping'
import { CartPage } from '@/pages/CartPage'
import { detectServer } from '@/state/serverStorage'
import { UserStateProvider, useUserState } from '@/state/UserStateProvider'
import { AboutLeft, AboutRight } from '@/pages/AboutPages'
import { ChapterPage } from '@/pages/ChapterPage'
import { CoverPage } from '@/pages/CoverPage'
import { RecipeLeft, RecipeRight, RecipeSingle } from '@/pages/RecipePage'
import { STORAGE_OFFLINE_BADGE } from '@/pages/labels'
import { SettingsPage } from '@/pages/SettingsPage'
import { StoragePanel } from '@/pages/StoragePanel'
import { ShoppingListPage } from '@/pages/ShoppingListPage'
import { SearchOverlay } from '@/pages/SearchOverlay'
import { TocPages } from '@/pages/TocPages'
import { TocProbe } from '@/pages/TocProbe'
import { probeNumberFor, sameMetrics } from '@/pages/tocMeasure'
import { PrintErrorBoundary } from '@/print/PrintErrorBoundary'
import { PrintRoot } from '@/print/PrintRoot'
import { PRINT_JOB_LABEL, printJobForRoute } from '@/print/printJob'
import { usePrintJob } from '@/print/usePrintJob'

function Library() {
  const { recipes: staticRecipes, ingredients } = useMemo(() => loadContent(), [])
  const { state, toggleFavorite, toggleCart, setCartMultiplier, removeFromCart, setPeople, setDayFactor, updateSettings, saveCustomRecipe, deleteCustomRecipe, importCustomRecipes, storageMode, retryServer, replaceState } = useUserState()
  // vlastní recepty patří do knihy jako ostatní: layout, obsah, hledání, košík i tisk dostanou sloučený seznam
  const recipes = useMemo(() => mergeRecipes(staticRecipes, state.customRecipes, ingredients), [staticRecipes, state.customRecipes, ingredients])
  const staticIds = useMemo(() => new Set(staticRecipes.map((r) => r.id)), [staticRecipes])
  // režim vlastní App: layout (recept na jedné stránce na mobilu) a s ním čísla stran v obsahu odpovídají režimu (R6)
  const mode = useViewMode()
  // obsah se stránkuje podle naměřené výšky stránky a řádků (R9); do prvního měření platí odhad v jednotkách
  const [tocMetrics, setTocMetrics] = useState<TocMetrics | null>(null)
  // nové měření se stejnými čísly layout nepřestaví (žádná smyčka měření ↔ layout)
  const onTocMeasure = useCallback((m: TocMetrics) => setTocMetrics((prev) => (sameMetrics(prev, m) ? prev : m)), [])
  const tocPages = useMemo(() => tocPageCount(recipes, tocMetrics), [recipes, tocMetrics])
  const layout = useMemo(() => buildLayout(recipes, { tocPageCount: tocPages, mode }), [recipes, tocPages, mode])
  // měřicí řádky mají číslo strany o stejném počtu číslic jako největší číslo v knize (na mobilu dvouciferné, ne vždy „888“)
  const probeNumber = probeNumberFor(layout.entries.length)
  const tocProbe = useMemo(() => <TocProbe recipes={recipes} pageNumber={probeNumber} onMeasure={onTocMeasure} />, [recipes, probeNumber, onTocMeasure])
  const { index, setIndex, jumpTo } = useHashRoute(layout)
  // naposledy otevřený recept (jen v tomto sezení) se zvýrazní v obsahu a v úvodu kapitoly (úprava stavu při renderu)
  const [lastRecipeId, setLastRecipeId] = useState<string | null>(null)
  const currentRoute = indexToRoute(index, layout)
  if (currentRoute.kind === 'recipe' && currentRoute.id !== lastRecipeId) setLastRecipeId(currentRoute.id)
  // Ctrl+P tiskne podle aktuální stránky (spec §4); index je zároveň klíč, který zapomene nedokončený tisk tlačítkem
  const currentPrintJob = useCallback(() => printJobForRoute(indexToRoute(index, layout)), [index, layout])
  const { job: printJob, print } = usePrintJob(currentPrintJob, index)
  // tlačítko tisku mimo knihu tiskne totéž co Ctrl+P a jménem říká co (spec §2 [R2])
  const printLabel = PRINT_JOB_LABEL[currentPrintJob().kind]
  // datum do hlaviček tisku: čerstvé při každém novém tisku, ne při každém renderu
  // eslint-disable-next-line react-hooks/exhaustive-deps -- printJob je záměrně jen spouštěč nového data
  const printDate = useMemo(() => new Date(), [printJob])
  const recipeById = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes])
  const portions = useMemo<Portions>(
    () => ({ people: state.people, childCoef: state.settings.childCoef, dayFactor: state.dayFactor }),
    [state.people, state.settings.childCoef, state.dayFactor],
  )
  const historical = state.settings.historicalIngredients
  const shoppingList = useMemo(
    () => buildShoppingList(state.cart, recipeById, ingredients, { persons: persons(portions), historical }),
    [state.cart, recipeById, ingredients, portions, historical],
  )
  const [filter, setFilter] = useState<Filter>(EMPTY_FILTER)
  // po smazání posledního vlastního receptu pilulka „Vlastní“ zmizí; zapnutý filtr by se nedal vypnout (úprava stavu při renderu)
  if (filter.books.includes('vlastni') && !recipes.some(isCustomRecipe)) {
    setFilter({ ...filter, books: filter.books.filter((b) => b !== 'vlastni') })
  }

  const favorites = useMemo(() => new Set(state.favorites), [state.favorites])
  // zapnutý filtr obsahu platí i pro listování (skryté stránky se přeskočí), úvody kapitol a hledání;
  // layout a čísla stran zůstávají, odkazem (hledání bez filtru, košík) se dá skočit i na skrytý recept
  const filterActive = isFilterActive(filter)
  const shownRecipes = useMemo(
    () => (filterActive ? filterRecipes(recipes, ingredients, filter, { favorites }) : recipes),
    [filterActive, recipes, ingredients, filter, favorites],
  )
  const hidden = useMemo(() => {
    if (!filterActive) return undefined
    const set = hiddenPages(layout, new Set(shownRecipes.map((r) => r.id)), tocPageCount(shownRecipes, tocMetrics))
    return (page: number) => set.has(page)
  }, [filterActive, layout, shownRecipes, tocMetrics])
  const inCart = useMemo(() => new Set(state.cart.map((e) => e.recipeId)), [state.cart])
  // záznam o receptu, který už v knize není (poškozený nebo starý stav), se nepočítá – stránka košíku ho nevykreslí
  const cartCount = useMemo(() => state.cart.filter((e) => recipeById.has(e.recipeId)).length, [state.cart, recipeById])

  const navigate = useCallback(
    (route: Route) => {
      const target = routeToIndex(route, layout)
      if (target !== null) jumpTo(target)
    },
    [layout, jumpTo],
  )

  // smazání: hash nejdřív na kapitolu (obsah, když v ní nic nezbude) – po změně layoutu na ni useHashRoute přejde (ruling R8, R10)
  const removeCustomRecipe = useCallback(
    (recipe: Recipe) => {
      const left = recipes.some((r) => r.chapter === recipe.chapter && r.id !== recipe.id)
      history.replaceState(null, '', routeToHash(left ? { kind: 'chapter', id: recipe.chapter } : { kind: 'toc' }))
      deleteCustomRecipe(recipe.id)
    },
    [recipes, deleteCustomRecipe],
  )

  // hláška importu žije tady: po změně layoutu se stránka tiráže na okamžik odmontuje a vlastní stav by zmizel
  const [importMessage, setImportMessage] = useState('')
  // import: hash nejdřív na tiráž – po změně layoutu na ni useHashRoute přejde (ruling R8)
  const importRecipes = useCallback(
    (imported: Recipe[], overwrite: boolean) => {
      history.replaceState(null, '', routeToHash({ kind: 'settings' }))
      importCustomRecipes(imported, overwrite)
    },
    [importCustomRecipes],
  )

  // formulář vlastního receptu: dialog nad knihou řízený hashem (ruling R7); Zpět v prohlížeči ho zavře
  const [editor, setEditor] = useState<EditorRoute | null>(() => editorRouteFromHash(location.hash))
  // prvek, který formulář otevřel (uložený dřív, než je `main` inert); po zavření na něj jde fokus
  const [opener, setOpener] = useState<Element | null>(null)
  // formulář otevřený pushState v tomto sezení se zavírá přes history.back(); načtený z hashe jen přepíše hash
  const pushedEditor = useRef(false)
  // rozepsanost otevřeného formuláře (hlásí ji RecipeForm)
  const dirtyRef = useRef(false)
  const editorRef = useRef(editor)
  editorRef.current = editor
  const onDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty
  }, [])
  useEffect(() => {
    const onHash = () => {
      const route = editorRouteFromHash(location.hash)
      const open = editorRef.current
      // Zpět s rozepsaným formulářem: zeptat se; při odmítnutí vrátit hash formuláře
      if (open && route === null && dirtyRef.current && !window.confirm('Zahodit rozepsaný recept?')) {
        history.pushState(null, '', routeToHash(open))
        pushedEditor.current = true
        return
      }
      // hashchange = nový nebo projitý záznam historie, takže zavření se vrací přes history.back()
      pushedEditor.current = route !== null
      setEditor(route)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const customById = useMemo(() => new Map(state.customRecipes.map((r) => [r.id, r])), [state.customRecipes])
  // úprava jen existujícího vlastního receptu; knižní nebo neznámé id formulář neotevře
  const editing = editor?.kind === 'edit-recipe' ? customById.get(editor.id) : undefined
  const formOpen = editor?.kind === 'new-recipe' || editing !== undefined

  // otevření nemění stránku knihy: formulář leží nad stránkou, ze které se otevřel
  const openEditor = useCallback((route: EditorRoute) => {
    setOpener(document.activeElement)
    history.pushState(null, '', routeToHash(route))
    pushedEditor.current = true
    setEditor(route)
  }, [])
  const closeEditor = useCallback(() => {
    setEditor(null)
    if (pushedEditor.current) {
      pushedEditor.current = false
      history.back() // vrátí hash stránky, ze které se formulář otevřel (hashchange ho zavře znovu, beze změny)
    } else {
      history.replaceState(null, '', routeToHash(indexToRoute(index, layout)))
    }
  }, [index, layout])
  // uložení: hash nejdřív na recept – po změně layoutu na něj useHashRoute přejde (ruling R8)
  const saveRecipe = useCallback(
    (recipe: Recipe) => {
      history.replaceState(null, '', routeToHash({ kind: 'recipe', id: recipe.id }))
      pushedEditor.current = false
      setEditor(null)
      saveCustomRecipe(recipe)
    },
    [saveCustomRecipe],
  )
  const makeId = useCallback((title: string) => newCustomRecipeId(title, new Set(recipes.map((r) => r.id))), [recipes])

  const pages = useMemo<BookPageDef[]>(() => {
    const renderEntry = (entry: PageEntry): BookPageDef => {
      switch (entry.kind) {
        case 'cover':
          return { id: entry.id, tone: 'cover', render: () => <CoverPage /> }
        case 'about':
          return { id: entry.id, render: () => (entry.id === 'about-left' ? <AboutLeft onNavigate={navigate} /> : <AboutRight recipes={recipes} />) }
        case 'toc':
          return {
            id: entry.id,
            render: () => (
              <TocPages
                recipes={recipes}
                ingredients={ingredients}
                filter={filter}
                onFilterChange={setFilter}
                favorites={favorites}
                pageNumbers={layout.recipeIndex}
                page={entry.tocPage ?? 0}
                onNavigate={navigate}
                onToggleFavorite={toggleFavorite}
                inCart={inCart}
                onToggleCart={toggleCart}
                onNewRecipe={() => openEditor({ kind: 'new-recipe' })}
                metrics={tocMetrics}
                lastRecipeId={lastRecipeId}
              />
            ),
          }
        case 'chapter':
          return {
            id: entry.id,
            render: () => (
              <ChapterPage
                chapter={entry.chapter!}
                recipes={shownRecipes.filter((r) => r.chapter === entry.chapter)}
                pageNumberOf={(id) => layout.recipeIndex.get(id)}
                lastRecipeId={lastRecipeId}
              />
            ),
          }
        case 'recipe': {
          const recipe = recipeById.get(entry.recipeId!)!
          const own = isCustomRecipe(recipe)
          return {
            id: entry.id,
            tone: own ? 'note' : 'aged',
            // epocha na samotné stránce: `--paper` a písmo platí tam, kde se papír kreslí (obě poloviny);
            // vlastní recept se natáčí jen uvnitř (.recipe-page), ne celá .page (ruling R9)
            className: `era--${BOOK_META[recipe.source.book].era}`,
            render: () => {
              const actions = {
                favorite: favorites.has(recipe.id),
                onToggleFavorite: () => toggleFavorite(recipe.id),
                inCart: inCart.has(recipe.id),
                onToggleCart: () => toggleCart(recipe.id),
              }
              const info = {
                recipe,
                ingredients,
                portions,
                historical,
                onEdit: own ? () => openEditor({ kind: 'edit-recipe', id: recipe.id }) : undefined,
                onDelete: own ? () => removeCustomRecipe(recipe) : undefined,
              }
              if (entry.half === 'full') return <RecipeSingle {...info} {...actions} />
              return entry.half === 'right' ? <RecipeRight recipe={recipe} {...actions} /> : <RecipeLeft {...info} />
            },
          }
        }
        case 'cart':
          return {
            id: entry.id,
            render: () => (
              <CartPage
                cart={state.cart}
                recipes={recipeById}
                ingredients={ingredients}
                portions={portions}
                kcalTarget={state.settings.kcalTarget}
                historical={historical}
                onPeopleChange={setPeople}
                onMultiplierChange={setCartMultiplier}
                onRemove={removeFromCart}
                onNavigate={navigate}
                onPrintBooklet={() => print({ kind: 'booklet' })}
                onPrintList={() => print({ kind: 'list' })}
              />
            ),
          }
        case 'list':
          return {
            id: entry.id,
            render: () => (
              <ShoppingListPage groups={shoppingList} people={state.people} historical={historical} dayFactor={state.dayFactor} onPrint={() => print({ kind: 'list' })} />
            ),
          }
        case 'settings':
          return {
            id: entry.id,
            render: () => (
              <SettingsPage settings={state.settings} onChange={updateSettings}>
                <StoragePanel state={state} mode={storageMode} onRetry={retryServer} onImport={replaceState} />
                <CustomRecipesSettings
                  recipes={state.customRecipes}
                  ingredients={ingredients}
                  staticIds={staticIds}
                  onNewRecipe={() => openEditor({ kind: 'new-recipe' })}
                  onImport={importRecipes}
                  message={importMessage}
                  onMessage={setImportMessage}
                />
              </SettingsPage>
            ),
          }
        default:
          return { id: entry.id, render: () => null }
      }
    }
    return layout.entries.map(renderEntry)
  }, [layout, recipes, shownRecipes, ingredients, recipeById, filter, tocMetrics, lastRecipeId, favorites, inCart, portions, historical, navigate, openEditor, removeCustomRecipe, toggleFavorite, toggleCart, state, updateSettings, setPeople, setCartMultiplier, removeFromCart, shoppingList, print, storageMode, retryServer, replaceState, staticIds, importRecipes, importMessage])

  const last = layout.entries.length - 1
  const announcement = describePage(layout.entries[index], index, last, recipeById)

  return (
    <>
      <main style={{ height: '100%' }} inert={formOpen}>
        <h1 className="visually-hidden">Kuchařka</h1>
        <Bookmark
          people={state.people}
          dayFactor={state.dayFactor}
          cartCount={cartCount}
          onPeopleChange={setPeople}
          onDayFactorChange={setDayFactor}
          onOpenCart={() => navigate({ kind: 'cart' })}
          onOpenSettings={() => navigate({ kind: 'settings' })}
        />
        <BookControls
          onHome={() => navigate({ kind: 'toc' })}
          onPrint={() => print(currentPrintJob())}
          printLabel={printLabel}
          onOpenCart={() => navigate({ kind: 'cart' })}
          cartCount={cartCount}
        >
          <SearchOverlay recipes={recipes} ingredients={ingredients} filter={filter} favorites={favorites} onNavigate={navigate} />
        </BookControls>
        {storageMode === 'server-unavailable' && (
          <p className="storage-badge" role="status">
            {STORAGE_OFFLINE_BADGE}
          </p>
        )}
        <div className="visually-hidden" aria-live="polite" role="status">
          {announcement}
        </div>
        <Book index={index} onIndexChange={setIndex} pages={pages} mode={mode} measure={tocProbe} hidden={hidden} />
      </main>
      {formOpen && (
        <RecipeForm
          key={editor?.kind === 'edit-recipe' ? editor.id : 'novy'}
          ingredients={ingredients}
          recipe={editing}
          defaultChapter={layout.entries[index]?.chapter}
          makeId={makeId}
          onSave={saveRecipe}
          onCancel={closeEditor}
          onDirtyChange={onDirtyChange}
          returnFocusTo={opener}
        />
      )}
      {printJob && (
        <PrintErrorBoundary>
        <PrintRoot
          job={printJob}
          data={{
            recipes,
            recipeById,
            ingredients,
            portions,
            historical,
            cart: state.cart,
            shoppingList,
            recipePages: layout.recipeIndex,
            chapterPages: layout.chapterIndex,
            date: printDate,
          }}
        />
        </PrintErrorBoundary>
      )}
    </>
  )
}

function describePage(entry: PageEntry | undefined, index: number, last: number, recipes: Map<string, { title: string }>): string {
  if (!entry) return ''
  let name: string
  switch (entry.kind) {
    case 'cover': return 'Obálka'
    case 'about': name = 'O této knize'; break
    case 'toc': name = 'Obsah'; break
    case 'chapter': name = CHAPTER_META[entry.chapter!].title; break
    case 'recipe': name = (recipes.get(entry.recipeId!)?.title ?? 'Recept') + (entry.half === 'right' ? ' – postup' : ''); break
    case 'cart': name = 'Košík'; break
    case 'list': name = 'Nákupní seznam'; break
    case 'settings': name = 'Tiráž a nastavení'; break
    default: name = 'Prázdná strana'
  }
  return `Strana ${index} z ${last} – ${name}`
}

export function App() {
  return (
    // statický hosting (GitHub Pages) nemá API – stav jen v localStorage, bez zbytečného dotazu na server
    <UserStateProvider connect={import.meta.env.VITE_STATIC ? undefined : detectServer}>
      <Library />
    </UserStateProvider>
  )
}
export default App
