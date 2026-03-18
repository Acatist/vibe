import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  errorMessage: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message ?? String(error) }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] Render crash:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-3xl">⚠️</p>
            <p className="text-sm font-medium text-foreground">Algo salió mal</p>
            <p className="text-xs text-muted-foreground">
              Se produjo un error al cargar esta sección.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="mt-2 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Reintentar
            </button>
            {this.state.errorMessage && (
              <p className="mt-2 text-[10px] text-muted-foreground font-mono px-3 break-all">
                {this.state.errorMessage}
              </p>
            )}
          </div>
        )
      )
    }
    return this.props.children
  }
}
