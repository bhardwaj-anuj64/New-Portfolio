import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportClientError } from '../../services/api'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

// A render-time exception in any one section (e.g. a Three.js mesh viewer choking on a malformed
// mesh) would otherwise white-screen the whole site — window.onerror/onunhandledrejection in
// App.tsx only logs, it doesn't catch React render errors or recover the UI.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportClientError(error.message, info.componentStack ?? 'error-boundary')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-lg px-6 py-16 text-center text-white/60">
          <p>Something broke on this page.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white/80 hover:bg-white/10"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
