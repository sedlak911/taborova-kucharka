interface IconProps {
  filled?: boolean
}

export function HeartIcon({ filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 20.5s-7.6-4.7-9.4-9.4C1.3 7.7 3.5 4.5 6.9 4.5c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 3.4 0 5.6 3.2 4.3 6.6-1.8 4.7-9.4 9.4-9.4 9.4z" />
    </svg>
  )
}

export function CartIcon({ filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8h14.5l-1.7 6.6a1.6 1.6 0 0 1-1.6 1.2H9a1.6 1.6 0 0 1-1.6-1.3z" fill={filled ? 'currentColor' : 'none'} />
      <path d="M2.5 4h2.6L7.4 14.5" />
      <circle cx="9.5" cy="19.5" r="1.4" />
      <circle cx="17" cy="19.5" r="1.4" />
    </svg>
  )
}

export function PrinterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 9V3.5h10V9" />
      <rect x="3" y="9" width="18" height="8" rx="1.5" />
      <path d="M7 14h10v6.5H7z" />
    </svg>
  )
}

/** Pero: značka vlastního (ručně psaného) receptu v obsahu. */
export function PenIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20l1-4.5L16.5 4a2.1 2.1 0 0 1 3 3L8 18.5z" />
      <path d="M14.5 6l3 3" />
    </svg>
  )
}
