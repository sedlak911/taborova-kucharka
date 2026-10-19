import type { ReactNode } from 'react'
import { DEFAULT_KCAL_TARGET } from '@/domain/portions'
import { CHILD_COEF_MAX, CHILD_COEF_MIN, KCAL_TARGET_MAX, KCAL_TARGET_MIN, type UserState } from '@/state/userState'
import { formatInteger } from './labels'
import { NumberField } from './NumberField'

interface Props {
  settings: UserState['settings']
  onChange: (patch: Partial<UserState['settings']>) => void
  children?: ReactNode
}

/** Tiráž = nastavení (spec §2 bod 6): koeficient dítěte, cílové kalorie, historické suroviny; panel ukládání přes children. */
export function SettingsPage({ settings, onChange, children }: Props) {
  return (
    <article className="settings-page">
      <h2>Tiráž a nastavení</h2>
      <p className="settings-intro">Podle těchto hodnot se přepočítávají recepty, nákupní seznam i výživa v košíku.</p>
      <div className="settings-fields">
        <NumberField label="Koeficient dítěte" value={settings.childCoef} min={CHILD_COEF_MIN} max={CHILD_COEF_MAX} step={0.05} onCommit={(childCoef) => onChange({ childCoef })} />
        <small className="settings-hint">Kolik sní dítě oproti dospělému (0,8 = 80 %).</small>
        <NumberField
          label="Denní cíl dospělého (kcal)"
          value={settings.kcalTarget ?? DEFAULT_KCAL_TARGET}
          min={KCAL_TARGET_MIN}
          max={KCAL_TARGET_MAX}
          step={50}
          onCommit={(kcalTarget) => onChange({ kcalTarget })}
        />
        <small className="settings-hint">
          Násobí se náročností dne.{' '}
          {settings.kcalTarget !== undefined && (
            <button type="button" className="settings-reset" onClick={() => onChange({ kcalTarget: undefined })}>
              {`Výchozí cíl (${formatInteger(DEFAULT_KCAL_TARGET)} kcal)`}
            </button>
          )}
        </small>
        <label className="settings-check">
          <input type="checkbox" checked={settings.historicalIngredients} onChange={(e) => onChange({ historicalIngredients: e.currentTarget.checked })} />
          Historické suroviny – jak je uvádí původní kniha (místo modernizovaných)
        </label>
      </div>
      {children}
      <footer className="settings-colophon">Kuchařka pro tábory · osobní sbírka receptů z historických kuchařek · výživové údaje USDA SR Legacy (CC0).</footer>
    </article>
  )
}
