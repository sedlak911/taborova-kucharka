// src/pages/StepTime.tsx – značka stopek u kroku a řádek „Hotovo“ (spec §2 [R3]); kniha i tisk
import { stepStartLabel } from '@/domain/steps'
import { formatStopwatch } from './labels'

/**
 * Čas od začátku vaření, kdy krok začíná („5:00“), nebo „mezitím“ u souběžného kroku.
 * role="img": aria-label na prostém span (role generic) čtečky ignorují; značka se čte jako celek (ruling R5).
 */
export function StepTime({ start }: { start: number | null }) {
  const label = stepStartLabel(start)
  const parallel = start === null
  return (
    <span
      className={parallel ? 'step-time step-time--parallel' : 'step-time'}
      role="img"
      aria-label={parallel ? 'mezitím, souběžně s předchozím krokem' : `začátek ${label}`}
    >
      {label}
    </span>
  )
}

/** Řádek pod postupem: „Hotovo: 50:00“ – součet minut nesouběžných kroků. */
export function StepsTotal({ total, className }: { total: number; className: string }) {
  return (
    <p className={className}>
      Hotovo: <span className="step-time step-time--total">{formatStopwatch(total)}</span>
    </p>
  )
}
