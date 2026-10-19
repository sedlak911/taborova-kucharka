import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { loadContent } from '@/content/loadContent'
import { customRecipe } from '@/test/customRecipe'
import { scaleLine } from '@/domain/scaling'
import { IngredientTable } from './IngredientTable'
import { formatAmount } from './labels'

const { recipes, ingredients } = loadContent()
const byId = (id: string) => recipes.find((r) => r.id === id)!
const portions = (adults: number, children: number, dayFactor = 1) => ({ people: { adults, children }, childCoef: 0.8, dayFactor })

describe('IngredientTable', () => {
  it('4 dospělí: hlavička „Pro 4 osoby“, všechny řádky a šedá hodnota na osobu', () => {
    const recipe = byId('chilli-con-carne')
    render(<IngredientTable recipe={recipe} ingredients={ingredients} portions={portions(4, 0)} historical={false} />)
    expect(screen.getAllByRole('row')).toHaveLength(recipe.ingredients.length + 1)
    expect(screen.getByRole('columnheader', { name: 'Pro 4 osoby' })).toBeInTheDocument()
    const line = recipe.ingredients.find((l) => l.ingredientId === 'sul')!
    const one = scaleLine(line, ingredients.get('sul')!, 0.25)
    const row = screen.getByText(ingredients.get('sul')!.name).closest('tr')!
    expect(within(row).getAllByText(formatAmount(one.amount, one.unit)).length).toBeGreaterThan(0)
  })

  it('18 dětí + 6 dospělých: P = 20,4, k = 5,1 – vejce 7,25 ks → 37 ks, na osobu 2 ks', () => {
    render(<IngredientTable recipe={byId('michana-vejce')} ingredients={ingredients} portions={portions(6, 18)} historical={false} />)
    expect(screen.getByRole('columnheader', { name: 'Pro 24 osob' })).toBeInTheDocument()
    expect(screen.getByText('18 dětí + 6 dospělých · přepočteno na 20,4 porce')).toBeInTheDocument()
    const row = screen.getByText('Vejce').closest('tr')!
    expect(within(row).getByText('37 ks')).toBeInTheDocument()
    expect(within(row).getByText('2 ks')).toBeInTheDocument()
  })

  it('náročnost dne se promítne do popisu i množství', () => {
    render(<IngredientTable recipe={byId('michana-vejce')} ingredients={ingredients} portions={portions(4, 0, 1.25)} historical={false} />)
    expect(screen.getByText('přepočteno na 5 porcí (náročnost dne 1,25)')).toBeInTheDocument()
    const row = screen.getByText('Vejce').closest('tr')!
    expect(within(row).getByText('9½ ks')).toBeInTheDocument() // P = 5, k = 1,25: 7,25 × 1,25 = 9,06 → nahoru 9½
  })

  it('historické suroviny: řádek z original a poznámka s dnešní variantou', () => {
    const recipe = byId('americke-palacinky')
    const frozen = ingredients.get('vejce-mrazena')!.name
    const { rerender } = render(<IngredientTable recipe={recipe} ingredients={ingredients} portions={portions(4, 0)} historical={false} />)
    expect(screen.getByText(`původně: ${frozen} 50 g (na 4 porce)`)).toBeInTheDocument()
    rerender(<IngredientTable recipe={recipe} ingredients={ingredients} portions={portions(4, 0)} historical />)
    expect(screen.getByText(frozen)).toBeInTheDocument()
    expect(screen.getByText('dnes: Vejce 1 ks (na 4 porce)')).toBeInTheDocument()
  })

  it('slévaná voda (vessel) má poznámku „podle nádoby“', () => {
    render(<IngredientTable recipe={byId('spagety-s-maslem-a-syrem')} ingredients={ingredients} portions={portions(4, 0)} historical={false} />)
    const row = screen.getByText('Voda').closest('tr')!
    expect(within(row).getByText('(podle nádoby)')).toBeInTheDocument()
  })

  it('násobek z košíku (brožurka): ×2 zdvojí faktor, hlavička a popis to uvádějí', () => {
    render(<IngredientTable recipe={byId('michana-vejce')} ingredients={ingredients} portions={portions(6, 18)} historical={false} multiplier={2} />)
    expect(screen.getByRole('columnheader', { name: 'Pro 24 osob ×2' })).toBeInTheDocument()
    expect(screen.getByText('18 dětí + 6 dospělých · přepočteno na 40,8 porce')).toBeInTheDocument()
    const row = screen.getByText('Vejce').closest('tr')!
    expect(within(row).getByText('74 ks')).toBeInTheDocument() // k = 20,4 × 2 / 4 = 10,2: 7,25 × 10,2 = 73,95 → nahoru 74
    expect(within(row).getByText('2 ks')).toBeInTheDocument() // na osobu se násobek nepromítá
  })

  it('vlastní popisek šedého sloupce (tisk A4: „Na 1 osobu“)', () => {
    render(<IngredientTable recipe={byId('michana-vejce')} ingredients={ingredients} portions={portions(6, 18)} historical={false} perPersonLabel="Na 1 osobu" />)
    expect(screen.getByRole('columnheader', { name: 'Na 1 osobu' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Pro 24 osob' })).toBeInTheDocument()
  })

  it('vlastní recept pro 2 porce: 4 osoby = dvojnásobek (k = P / baseServings)', () => {
    render(<IngredientTable recipe={customRecipe()} ingredients={ingredients} portions={portions(4, 0)} historical={false} />)
    expect(within(screen.getByText('Hladká mouka').closest('tr')!).getByText('250 g')).toBeInTheDocument()
    expect(within(screen.getByText('Vejce').closest('tr')!).getByText('2 ks')).toBeInTheDocument()
    expect(screen.getByText('přepočteno na 4 porce')).toBeInTheDocument()
  })
})
