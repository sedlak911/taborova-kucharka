import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { MAX_BACKUP_BYTES, readFileText } from '@/state/backup'
import type { StorageMode } from '@/state/storage'
import { DEFAULT_USER_STATE, toggleFavorite, type UserState } from '@/state/userState'
import { StoragePanel } from './StoragePanel'

afterEach(() => vi.restoreAllMocks())

function setup(mode: StorageMode = 'local', onRetry: () => Promise<void> = async () => {}) {
  const onImport = vi.fn<(s: UserState) => void>()
  const state = toggleFavorite(DEFAULT_USER_STATE, 'r1')
  const utils = render(<StoragePanel state={state} mode={mode} onRetry={onRetry} onImport={onImport} now={() => new Date(2026, 9, 15)} />)
  return { ...utils, onImport, state, user: userEvent.setup() }
}

const jsonFile = (text: string, name = 'zaloha.json') => new File([text], name, { type: 'application/json' })

test('režim ukládání: text, nápověda a tlačítko obnovení jen mimo režim server', () => {
  const { rerender, onImport } = setup('local')
  expect(screen.getByRole('heading', { level: 3, name: 'Data a ukládání' })).toBeInTheDocument()
  expect(screen.getByText('jen v tomto prohlížeči')).toBeInTheDocument()
  expect(screen.getByText(/npm run serve/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Zkusit server znovu' })).toBeInTheDocument()
  rerender(<StoragePanel state={DEFAULT_USER_STATE} mode="server" onRetry={async () => {}} onImport={onImport} />)
  expect(screen.getByText('server (soubor userdata/user-state.json)')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Zkusit server znovu' })).toBeNull()
  rerender(<StoragePanel state={DEFAULT_USER_STATE} mode="server-unavailable" onRetry={async () => {}} onImport={onImport} />)
  expect(screen.getByText('server nedostupný – ukládá se jen v tomto prohlížeči')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Zkusit server znovu' })).toBeInTheDocument()
})

test('Zkusit server znovu: během pokusu zakázané tlačítko', async () => {
  let finish!: () => void
  const onRetry = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))
  const { user } = setup('server-unavailable', onRetry)
  await user.click(screen.getByRole('button', { name: 'Zkusit server znovu' }))
  expect(onRetry).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: 'Zkouším server…' })).toBeDisabled()
  await act(async () => finish())
  expect(screen.getByRole('button', { name: 'Zkusit server znovu' })).toBeEnabled()
})

test('Exportovat data stáhne kucharka-data-YYYY-MM-DD.json s aktuálním stavem', async () => {
  let blob: Blob | undefined
  URL.createObjectURL = vi.fn((b: Blob) => {
    blob = b
    return 'blob:test'
  })
  URL.revokeObjectURL = vi.fn()
  let download = ''
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    download = this.download
  })
  const { user, state } = setup()
  await user.click(screen.getByRole('button', { name: 'Exportovat data' }))
  expect(download).toBe('kucharka-data-2026-10-15.json')
  expect(JSON.parse(await readFileText(blob!))).toEqual(state)
  expect(screen.getByRole('status')).toHaveTextContent('Staženo: kucharka-data-2026-10-15.json')
})

test('Import platné zálohy: souhrn a přepsání až po potvrzení', async () => {
  const { user, onImport } = setup()
  const backup = { ...DEFAULT_USER_STATE, favorites: ['x', 'y'], cart: [{ recipeId: 'z', multiplier: 2 }] }
  await user.upload(screen.getByLabelText('Importovat data…'), jsonFile(JSON.stringify(backup)))
  const confirm = await screen.findByRole('group', { name: 'Potvrzení importu' })
  expect(confirm).toHaveTextContent('„zaloha.json“')
  expect(confirm).toHaveTextContent('oblíbené: 2 · v košíku: 1')
  expect(confirm).not.toHaveTextContent('uvařen')
  expect(onImport).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Přepsat data' }))
  expect(onImport).toHaveBeenCalledWith(backup)
  expect(screen.queryByRole('group', { name: 'Potvrzení importu' })).toBeNull()
  expect(screen.getByRole('status')).toHaveTextContent('Data byla importována.')
})

test('Import lze zrušit', async () => {
  const { user, onImport } = setup()
  await user.upload(screen.getByLabelText('Importovat data…'), jsonFile('{"version":1}'))
  await user.click(await screen.findByRole('button', { name: 'Zrušit' }))
  expect(screen.queryByRole('group', { name: 'Potvrzení importu' })).toBeNull()
  expect(onImport).not.toHaveBeenCalled()
})

test('Import neplatného, cizího nebo příliš velkého souboru ukáže chybu a nic nepřepíše', async () => {
  const { user, onImport } = setup()
  const input = screen.getByLabelText('Importovat data…')
  await user.upload(input, jsonFile('{nejson'))
  expect(await screen.findByRole('alert')).toHaveTextContent('Soubor není platný JSON.')
  await user.upload(input, jsonFile('{"foo":1}'))
  expect(await screen.findByRole('alert')).toHaveTextContent('Soubor není záloha kuchařky')
  await user.upload(input, jsonFile('x'.repeat(MAX_BACKUP_BYTES + 1)))
  expect(await screen.findByRole('alert')).toHaveTextContent('Soubor je příliš velký (nejvýš 1 MB).')
  expect(screen.queryByRole('group', { name: 'Potvrzení importu' })).toBeNull()
  expect(onImport).not.toHaveBeenCalled()
})

test('Selhání čtení souboru ukáže chybu a nevytvoří import', async () => {
  vi.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (this: FileReader) {
    setTimeout(() => this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>))
  })
  const { user, onImport } = setup()
  await user.upload(screen.getByLabelText('Importovat data…'), jsonFile('{"version":1}'))
  expect(await screen.findByRole('alert')).toHaveTextContent('Soubor se nepodařilo přečíst.')
  expect(screen.queryByRole('group', { name: 'Potvrzení importu' })).toBeNull()
  expect(onImport).not.toHaveBeenCalled()
})
