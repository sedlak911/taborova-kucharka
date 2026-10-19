import type { z } from 'zod'
import type { IngredientSchema, IngredientLineSchema, RecipeSchema, StepSchema, NutritionSchema, UNITS, SCALING_CLASSES, TAGS, EQUIPMENT, CHAPTERS, CATEGORIES, ALLERGENS, BOOKS } from './schema'

export type Unit = (typeof UNITS)[number]
export type ScalingClass = (typeof SCALING_CLASSES)[number]
export type Tag = (typeof TAGS)[number]
export type Equipment = (typeof EQUIPMENT)[number]
export type Chapter = (typeof CHAPTERS)[number]
export type Category = (typeof CATEGORIES)[number]
export type Allergen = (typeof ALLERGENS)[number]
export type Book = (typeof BOOKS)[number]
export type Nutrition = z.infer<typeof NutritionSchema>
export type Ingredient = z.infer<typeof IngredientSchema>
export type IngredientLine = z.infer<typeof IngredientLineSchema>
export type Recipe = z.infer<typeof RecipeSchema>
export type Step = z.infer<typeof StepSchema>
