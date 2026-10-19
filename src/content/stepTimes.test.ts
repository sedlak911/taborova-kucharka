// src/content/stepTimes.test.ts – časování kroků v datech (spec §5.1 [R3], fáze 10 Task 8)
import { isStepTotalPlausible, stepTimeline } from '@/domain/steps'
import { loadContent } from './loadContent'

const books = loadContent().recipes.filter((r) => r.source.book !== 'vlastni')

test('každý knižní recept má časy kroků a „Hotovo“ mezi polovinou a celým timeMinutes', () => {
  const problems = books.flatMap((r) => {
    const { total } = stepTimeline(r.steps)
    return total === 0 || !isStepTotalPlausible(total, r.timeMinutes) ? [`${r.id}: Hotovo ${total}, timeMinutes ${r.timeMinutes}`] : []
  })
  expect(problems).toEqual([])
})

test('první krok žádného receptu není souběžný', () => {
  expect(books.filter((r) => r.steps[0].parallel).map((r) => r.id)).toEqual([])
})
