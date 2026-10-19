// Jen pro vývoj: když přibudou recepty v data/recipes (digitalizace běží na pozadí), stránka se sama obnoví.
// HMR přes WebSocket na telefonu po zamknutí obrazovky odpadne, proto se počet receptů ověřuje dotazem.
const INTERVAL_MS = 30_000

export function startDevReload(): void {
  if (import.meta.env.MODE !== 'development' || typeof window === 'undefined') return
  let known: number | null = null
  const check = async () => {
    if (document.visibilityState === 'hidden') return
    try {
      const res = await fetch(`/src/content/loadContent.ts?devReload=${Date.now()}`, { cache: 'no-store' })
      const text = await res.text()
      const count = (text.match(/data\/recipes\/[^"'`]+\.json/g) ?? []).length
      if (known === null) known = count
      else if (count !== known) window.location.reload()
    } catch {
      // server neběží nebo síť vypadla – zkusíme příště
    }
  }
  void check()
  window.setInterval(() => void check(), INTERVAL_MS)
  document.addEventListener('visibilitychange', () => void check())
}
