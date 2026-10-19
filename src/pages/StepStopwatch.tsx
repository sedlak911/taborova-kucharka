// src/pages/StepStopwatch.tsx – malé stopky nad postupem (spec §2 [R3]); stav drží volající (useStopwatch)
import { formatClock } from './labels'

interface Props {
  elapsedSeconds: number
  running: boolean
  onStart: () => void
  onPause: () => void
  onReset: () => void
}

/** Uplynulý čas, Spustit/Pauza a Vynulovat. Bez zvuků a notifikací; v tisku skryté. */
export function StepStopwatch({ elapsedSeconds, running, onStart, onPause, onReset }: Props) {
  return (
    <div className="step-stopwatch" role="group" aria-label="Stopky">
      <span className="step-stopwatch__time" role="timer">
        {formatClock(elapsedSeconds)}
      </span>
      <button type="button" className="step-stopwatch__button" onClick={running ? onPause : onStart}>
        {running ? 'Pauza' : 'Spustit'}
      </button>
      <button type="button" className="step-stopwatch__button" onClick={onReset} disabled={!running && elapsedSeconds === 0}>
        Vynulovat
      </button>
    </div>
  )
}
