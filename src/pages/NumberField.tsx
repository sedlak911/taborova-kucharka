// src/pages/NumberField.tsx
import { useState } from 'react'

interface Props {
  label: string
  value: number
  min: number
  max: number
  step?: number
  /** Tlačítka − a + kolem pole (záložka s počtem osob). */
  stepper?: boolean
  onCommit: (value: number) => void
}

/** Číselné pole: rozepsaný text drží lokálně (lze smazat a psát znovu), platné číslo hned potvrdí, po opuštění ukáže uloženou hodnotu. */
export function NumberField({ label, value, min, max, step = 1, stepper = false, onCommit }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  const input = (
    <input
      type="number"
      inputMode={step < 1 ? 'decimal' : 'numeric'}
      min={min}
      max={max}
      step={step}
      value={draft ?? String(value)}
      onChange={(e) => {
        const text = e.currentTarget.value
        setDraft(text)
        const n = Number(text)
        if (text.trim() !== '' && Number.isFinite(n)) onCommit(n)
      }}
      onBlur={() => setDraft(null)}
    />
  )
  if (!stepper) {
    return (
      <label className="number-field">
        <span className="number-field__label">{label}</span>
        {input}
      </label>
    )
  }
  const bump = (delta: number) => {
    setDraft(null)
    onCommit(Math.min(max, Math.max(min, value + delta)))
  }
  return (
    <div className="number-field number-field--stepper">
      {/* label je display: contents – text, tlačítka a pole leží v jedné mřížce: Dospělí [−] 4 [+] */}
      <label className="number-field__wrap">
        <span className="number-field__label">{label}</span>
        {input}
      </label>
      <button type="button" className="number-field__step number-field__step--minus" aria-label={`${label}: o ${step} méně`} disabled={value <= min} onClick={() => bump(-step)}>−</button>
      <button type="button" className="number-field__step number-field__step--plus" aria-label={`${label}: o ${step} více`} disabled={value >= max} onClick={() => bump(step)}>+</button>
    </div>
  )
}
