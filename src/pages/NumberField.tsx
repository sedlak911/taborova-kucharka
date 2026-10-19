// src/pages/NumberField.tsx
import { useState } from 'react'

interface Props {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onCommit: (value: number) => void
}

/** Číselné pole: rozepsaný text drží lokálně (lze smazat a psát znovu), platné číslo hned potvrdí, po opuštění ukáže uloženou hodnotu. */
export function NumberField({ label, value, min, max, step = 1, onCommit }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <label className="number-field">
      <span className="number-field__label">{label}</span>
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
    </label>
  )
}
