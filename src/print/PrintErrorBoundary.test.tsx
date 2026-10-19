import { render } from '@testing-library/react'
import { PrintErrorBoundary } from './PrintErrorBoundary'

function Boom(): never {
  throw new Error('boom')
}

test('chyba v dítěti: nevykreslí nic, vyčistí data-print a zaloguje console.error', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  document.documentElement.setAttribute('data-print', 'booklet')
  const { container } = render(<div><PrintErrorBoundary><Boom /></PrintErrorBoundary><p>kniha</p></div>)
  expect(container.querySelector('p')).toHaveTextContent('kniha')
  expect(document.documentElement.getAttribute('data-print')).toBeNull()
  expect(spy.mock.calls.some((c) => c[0] === 'Chyba v tiskovém stromu')).toBe(true)
  spy.mockRestore()
})

test('bez chyby vykreslí děti', () => {
  const { getByText } = render(<PrintErrorBoundary><span>ok</span></PrintErrorBoundary>)
  expect(getByText('ok')).toBeInTheDocument()
})
