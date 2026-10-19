import { useRef, type ReactNode } from 'react'
import { useOverflowHint } from './useOverflowHint'

export type PageSide = 'left' | 'right' | 'single'
export type PageTone = 'aged' | 'cover' | 'note'

interface PageProps {
  side: PageSide
  tone?: PageTone
  pageNumber?: number
  className?: string
  children?: ReactNode
}

export function Page({ side, tone = 'aged', pageNumber, className, children }: PageProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const more = useOverflowHint(contentRef)
  const numbered = pageNumber !== undefined
  return (
    <section className={`page page--${side} page--${tone}${numbered ? ' page--numbered' : ''}${className ? ` ${className}` : ''}`}>
      <div className="page-content" ref={contentRef}>{children}</div>
      {/* zjevný scroll: přechod do ztracena + „pokračuje ↓“, dokud zbývá obsah pod okrajem */}
      {more && (
        <div className="page-more" aria-hidden="true">
          <span>pokračuje ↓</span>
        </div>
      )}
      {numbered && <span className="page-number">{pageNumber}</span>}
      {/* úchyt pro otáčení na vnějším okraji stránky (obsah stránky zůstává nativní) */}
      {side !== 'right' && <div className="page-edge page-edge--left" />}
      {side !== 'left' && <div className="page-edge page-edge--right" />}
    </section>
  )
}
