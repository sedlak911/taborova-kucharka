import type { Recipe } from '@/domain/types'

export const OWN_ID = 'vlastni-babicciny-livance-ab12'

/** Platný vlastní recept pro testy: 2 porce, suroviny z data/ingredients.json, alergeny odvozené ze surovin. */
export function customRecipe(over: Partial<Recipe> = {}): Recipe {
  return {
    id: OWN_ID,
    title: 'Babiččiny lívance',
    chapter: 'snidane-a-pecivo',
    baseServings: 2,
    timeMinutes: 30,
    difficulty: 1,
    tags: [],
    equipment: ['plotna'],
    allergens: ['lepek', 'vejce'],
    ingredients: [
      { ingredientId: 'hladka-mouka', amount: 125, unit: 'g' },
      { ingredientId: 'vejce', amount: 1, unit: 'ks' },
      { ingredientId: 'sul', amount: 1, unit: 'spetka' },
    ],
    steps: [{ text: 'Smíchej mouku s vejcem a solí.' }, { text: 'Peč na pánvi dozlatova.' }],
    source: { book: 'vlastni' },
    verified: true,
    ...over,
  }
}
