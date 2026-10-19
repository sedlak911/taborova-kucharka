// src/domain/steps.ts – časová osa kroků a formát stopek (spec §2, §5.1 [R3]).
// Jen relativní importy: soubor používají i skripty (validate, recipe-check, step-times).
import type { Step } from './types'

export interface TimedStep {
  /** Začátek kroku v minutách od začátku vaření; null = souběžný krok („mezitím“). */
  startMinutes: number | null
}

export interface StepTimeline {
  steps: TimedStep[]
  /** „Hotovo“: součet minut všech nesouběžných kroků. */
  total: number
}

/** Souběžný je krok s `parallel` – kromě prvního, který nemá s čím běžet souběžně (počítá se jako běžný). */
export function isParallelStep(step: Step, index: number): boolean {
  return index > 0 && step.parallel === true
}

/** Začátek každého kroku a „Hotovo“ (ruling R2). */
export function stepTimeline(steps: readonly Step[]): StepTimeline {
  let clock = 0
  const timed = steps.map((step, i): TimedStep => {
    if (isParallelStep(step, i)) return { startMinutes: null }
    const startMinutes = clock
    clock += step.minutes ?? 0
    return { startMinutes }
  })
  return { steps: timed, total: clock }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Uplynulý čas stopek: „0:05“, „12:34“, od hodiny „1:02:03“. */
export function formatClock(totalSeconds: number): string {
  const s = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

/** Značka stopek z minut: „0:00“, „5:00“, „35:00“, od hodiny „1:10:00“. */
export function formatStopwatch(minutes: number): string {
  return formatClock(minutes * 60)
}

/** Text značky u kroku: souběžný krok (`null`) „mezitím“, jinak čas začátku ve formátu stopek. */
export function stepStartLabel(startMinutes: number | null): string {
  return startMinutes === null ? 'mezitím' : formatStopwatch(startMinutes)
}

/** Nejmenší povolený podíl součtu kroků na `timeMinutes` (součet musí ležet v `[timeMinutes / 2, timeMinutes]`). */
export const STEP_TOTAL_MIN_RATIO = 0.5

/** Je součet kroků („Hotovo“) v souladu s `timeMinutes` receptu? */
export function isStepTotalPlausible(total: number, timeMinutes: number): boolean {
  return total >= timeMinutes * STEP_TOTAL_MIN_RATIO && total <= timeMinutes
}

/**
 * Krok, který podle stopek právě běží (spec §2 [R3], ruling R7): poslední nesouběžný krok s minutami, který už začal.
 * Kroky bez minut (pokyny) a souběžné kroky se nezvýrazňují; po „Hotovo“ a u receptu bez časů žádný (null).
 */
export function currentStepIndex(steps: readonly Step[], elapsedSeconds: number): number | null {
  const { steps: timed, total } = stepTimeline(steps)
  if (total === 0 || elapsedSeconds >= total * 60) return null
  let current: number | null = null
  for (let i = 0; i < steps.length; i++) {
    const start = timed[i].startMinutes
    if (start !== null && (steps[i].minutes ?? 0) > 0 && start * 60 <= elapsedSeconds) current = i
  }
  return current
}
