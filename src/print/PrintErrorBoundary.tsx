// src/print/PrintErrorBoundary.tsx
import { Component, type ReactNode } from 'react'

interface State { failed: boolean }

/** Chyba v tiskovém stromu nesmí shodit knihu: zaloguje se, strom zmizí a `data-print` se vyčistí. */
export class PrintErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Chyba v tiskovém stromu', error)
    document.documentElement.removeAttribute('data-print')
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
