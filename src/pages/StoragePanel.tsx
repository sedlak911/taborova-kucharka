import { useId, useState } from 'react'
import type { ChangeEvent } from 'react'
import { backupFileName, backupSummary, downloadText, MAX_BACKUP_BYTES, parseBackup, readFileText, serializeBackup } from '@/state/backup'
import type { StorageMode } from '@/state/storage'
import type { UserState } from '@/state/userState'
import { STORAGE_MODE_HINT, STORAGE_MODE_LABEL } from './labels'

interface Props {
  state: UserState
  mode: StorageMode
  onRetry: () => Promise<void>
  onImport: (state: UserState) => void
  now?: () => Date
}

interface Message {
  kind: 'ok' | 'error'
  text: string
}

/** Tiráž: režim ukládání, obnovení serveru, export a import zálohy (spec §2 bod 6, §5.2). */
export function StoragePanel({ state, mode, onRetry, onImport, now = () => new Date() }: Props) {
  const headingId = useId()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const [pending, setPending] = useState<{ state: UserState; fileName: string } | null>(null)

  const retry = async () => {
    setBusy(true)
    try {
      await onRetry()
    } finally {
      setBusy(false)
    }
  }

  const exportData = () => {
    const name = backupFileName(now())
    downloadText(name, serializeBackup(state))
    setMessage({ kind: 'ok', text: `Staženo: ${name}` })
  }

  const chooseFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const file = input.files?.[0]
    input.value = '' // stejný soubor půjde vybrat znovu
    if (!file) return
    setPending(null)
    if (file.size > MAX_BACKUP_BYTES) {
      setMessage({ kind: 'error', text: 'Soubor je příliš velký (nejvýš 1 MB).' })
      return
    }
    let text: string
    try {
      text = await readFileText(file)
    } catch {
      setMessage({ kind: 'error', text: 'Soubor se nepodařilo přečíst.' })
      return
    }
    const result = parseBackup(text)
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error })
      return
    }
    setMessage(null)
    setPending({ state: result.state, fileName: file.name })
  }

  const confirmImport = () => {
    if (!pending) return
    onImport(pending.state)
    setPending(null)
    setMessage({ kind: 'ok', text: 'Data byla importována.' })
  }

  return (
    <section className="storage-panel" aria-labelledby={headingId}>
      <h3 id={headingId}>Data a ukládání</h3>
      <p className="storage-mode" data-mode={mode}>
        Režim ukládání: <strong>{STORAGE_MODE_LABEL[mode]}</strong>
      </p>
      <p className="settings-hint">{STORAGE_MODE_HINT[mode]}</p>
      {mode !== 'server' && (
        <button type="button" className="cart-button" onClick={() => void retry()} disabled={busy}>
          {busy ? 'Zkouším server…' : 'Zkusit server znovu'}
        </button>
      )}
      <div className="storage-actions">
        <button type="button" className="cart-button" onClick={exportData}>
          Exportovat data
        </button>
        <label className="cart-button storage-import">
          Importovat data…
          <input type="file" accept="application/json,.json" className="visually-hidden" onChange={(e) => void chooseFile(e)} />
        </label>
      </div>
      {pending && (
        <div className="storage-confirm" role="group" aria-label="Potvrzení importu">
          <p>
            Import přepíše všechna data kuchařky (oblíbené, košík, vlastní recepty, osoby a nastavení) obsahem souboru „{pending.fileName}“: {backupSummary(pending.state)}.
          </p>
          <div className="storage-actions">
            <button type="button" className="cart-button" onClick={confirmImport}>
              Přepsat data
            </button>
            <button type="button" className="settings-reset" onClick={() => setPending(null)}>
              Zrušit
            </button>
          </div>
        </div>
      )}
      {message && (
        <p className={`storage-message storage-message--${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
    </section>
  )
}
