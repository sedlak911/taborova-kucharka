const common = { 'aria-hidden': true, focusable: false, fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const

type Corner = 'tl' | 'tr' | 'bl' | 'br'
type Edge = 'top' | 'bottom' | 'left' | 'right'
const CORNERS: Corner[] = ['tl', 'tr', 'bl', 'br']
const EDGES: Edge[] = ['top', 'bottom', 'left', 'right']

/** Ozdobný roh (kreslený pro levý horní roh; ostatní zrcadlí CSS). */
function CoverCorner({ corner }: { corner: Corner }) {
  return (
    <svg className={`cover-frame__corner cover-frame__corner--${corner}`} viewBox="0 0 80 80" strokeWidth="1.4" {...common}>
      <path d="M3 64V14A11 11 0 0 1 14 3h50" />
      <path d="M11 52V20a9 9 0 0 1 9-9h32" strokeWidth="0.8" />
      <path d="M20 20c12 0 20 7 20 15s-8 12-13 7.5 0-10 5.5-7.5" />
      <path d="M20 20c0 12 7 20 15 20" />
      <path d="M46 11q7-6 14 0q-7 6-14 0zM11 46q-6 7 0 14q6-7 0-14z" fill="currentColor" />
      <circle cx="20" cy="20" r="2.4" fill="currentColor" />
      <path d="M64 3q9 0 13 7M3 64q0 9 7 13" />
    </svg>
  )
}

/** Ornament uprostřed hrany: vodorovný (nahoře, dole) nebo svislý (vlevo, vpravo). */
function CoverEdge({ edge }: { edge: Edge }) {
  const className = `cover-frame__edge cover-frame__edge--${edge}`
  if (edge === 'left' || edge === 'right') {
    return (
      <svg className={className} viewBox="0 0 20 120" strokeWidth="1.2" {...common}>
        <path d="M10 4v38M10 78v38" />
        <path d="M10 42q-9 9 0 18q9 9 0 18" />
        <path d="M10 42q9 9 0 18q-9 9 0 18" strokeWidth="0.8" />
        <path d="M10 53l5 7-5 7-5-7z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 120 20" strokeWidth="1.2" {...common}>
      <path d="M4 10h38M78 10h38" />
      <path d="M42 10q9-9 18 0q9 9 18 0" />
      <path d="M42 10q9 9 18 0q9-9 18 0" strokeWidth="0.8" />
      <path d="M53 10l7-5 7 5-7 5z" fill="currentColor" />
    </svg>
  )
}

/** Zlatý rám obálky u okrajů knihy (spec §2 [R2]): dvojitá linka, ozdobné rohy a ornamenty uprostřed hran. */
export function CoverFrame() {
  return (
    <div className="cover-frame" aria-hidden="true">
      {CORNERS.map((c) => (
        <CoverCorner key={c} corner={c} />
      ))}
      {EDGES.map((e) => (
        <CoverEdge key={e} edge={e} />
      ))}
    </div>
  )
}

/** Malá vinětka (větvička s listy) pro úvodní stránky. */
export function Vignette() {
  return (
    <svg className="vignette" viewBox="0 0 120 40" width="120" height="40" strokeWidth="1.5" {...common}>
      <path d="M10 20h100" />
      <path d="M40 20q6-14 16-12q-2 12-16 12zM80 20q-6-14-16-12q2 12 16 12zM60 20q0 10 0 14" />
    </svg>
  )
}

/** Vodorovný oddělovač s kosočtvercem uprostřed. */
export function Divider() {
  return (
    <svg className="divider" viewBox="0 0 200 12" width="200" height="12" strokeWidth="1.2" {...common}>
      <path d="M0 6h88M112 6h88" />
      <path d="M100 1l5 5-5 5-5-5z" />
    </svg>
  )
}
