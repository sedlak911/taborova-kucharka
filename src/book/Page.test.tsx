import { fireEvent, render, screen } from '@testing-library/react'
import { Page } from './Page'

test('vykreslí obsah, stranu a číslo', () => {
  render(<Page side="left" tone="aged" pageNumber={12}>Ahoj</Page>)
  const sec = screen.getByText('Ahoj').closest('section')!
  expect(sec).toHaveClass('page', 'page--left', 'page--aged')
  expect(screen.getByText('12')).toHaveClass('page-number')
})

test('bez čísla stránky číslo nevykreslí', () => {
  render(<Page side="right" tone="cover">Obal</Page>)
  expect(document.querySelector('.page-number')).toBeNull()
})

test('úchyty pro otáčení na vnějším okraji podle strany', () => {
  const { container, rerender } = render(<Page side="right">x</Page>)
  expect(container.querySelectorAll('.page-edge')).toHaveLength(1)
  expect(container.querySelector('.page-edge--right')).not.toBeNull()
  rerender(<Page side="left">x</Page>)
  expect(container.querySelectorAll('.page-edge')).toHaveLength(1)
  expect(container.querySelector('.page-edge--left')).not.toBeNull()
  rerender(<Page side="single">x</Page>)
  expect(container.querySelector('.page-edge--left')).not.toBeNull()
  expect(container.querySelector('.page-edge--right')).not.toBeNull()
})

test('stránka s číslem má třídu page--numbered', () => {
  const { container, rerender } = render(<Page side="left" pageNumber={3}>x</Page>)
  expect(container.querySelector('.page')).toHaveClass('page--numbered')
  rerender(<Page side="left">x</Page>)
  expect(container.querySelector('.page')).not.toHaveClass('page--numbered')
})

describe('indikátor „pokračuje ↓“', () => {
  const keys = ['scrollHeight', 'clientHeight', 'scrollTop'] as const
  let metrics: Record<(typeof keys)[number], number> = { scrollHeight: 0, clientHeight: 0, scrollTop: 0 }
  beforeEach(() => {
    for (const key of keys) {
      Object.defineProperty(HTMLElement.prototype, key, {
        configurable: true,
        get: () => metrics[key],
        set: (v: number) => { metrics[key] = v },
      })
    }
  })
  afterEach(() => {
    for (const key of keys) delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key]
  })

  test('přetékající obsah ukáže indikátor, po doscrollování zmizí', () => {
    metrics = { scrollHeight: 1000, clientHeight: 400, scrollTop: 0 }
    const { container } = render(<Page side="left" pageNumber={5}>dlouhý obsah</Page>)
    expect(screen.getByText('pokračuje ↓').closest('.page-more')).toHaveAttribute('aria-hidden', 'true')
    metrics.scrollTop = 600
    fireEvent.scroll(container.querySelector('.page-content')!)
    expect(screen.queryByText('pokračuje ↓')).toBeNull()
  })

  test('obsah, který se vejde, indikátor nemá', () => {
    metrics = { scrollHeight: 400, clientHeight: 400, scrollTop: 0 }
    render(<Page side="left">krátký</Page>)
    expect(screen.queryByText('pokračuje ↓')).toBeNull()
  })
})
