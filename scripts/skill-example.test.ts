// scripts/skill-example.test.ts – vzor a pravidla skillu recipe-digitize odpovídají schématu fáze 10 (R3)
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { RecipeSchema } from '../src/domain/schema'
import { stepTimeline } from '../src/domain/steps'

const skillDir = fileURLToPath(import.meta.resolve('../.claude/skills/recipe-digitize'))

test('vzor skillu: kroky jako objekty s časy, Hotovo mezi polovinou a celým timeMinutes', () => {
  const raw = JSON.parse(readFileSync(`${skillDir}/reference/example-recipe.json`, 'utf8')) as { steps: unknown[] }
  expect(raw.steps.every((s) => typeof s === 'object' && s !== null)).toBe(true)
  const r = RecipeSchema.parse(raw)
  const { total } = stepTimeline(r.steps)
  expect(total).toBeGreaterThanOrEqual(r.timeMinutes / 2)
  expect(total).toBeLessThanOrEqual(r.timeMinutes)
})

test('SKILL.md krok 7 nese pravidla časování a nástroj step-times; batch.md je vyžaduje v briefu i v review', () => {
  const skill = readFileSync(`${skillDir}/SKILL.md`, 'utf8')
  expect(skill).toContain('PRAVIDLA ČASOVÁNÍ KROKŮ')
  expect(skill).toContain('npm run step-times -- <id>')
  expect(skill).toMatch(/Hotovo.*timeMinutes/)
  const batch = readFileSync(`${skillDir}/reference/batch.md`, 'utf8')
  expect(batch).toContain('kroky s časem podle SKILL.md kroku 7')
  expect(batch).toContain('časy kroků')
})
