import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

const RELOAD_FLAG = 'familyhub-error-reload'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

// Without this, any uncaught render error (including a failed lazy-loaded
// route chunk after a new deployment) unmounts the whole app and leaves a
// blank white screen with no way to recover except force-quitting.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('FamilyHub crashed:', error, info.componentStack)

    // One automatic reload attempt: most crashes here are a stale cached
    // page trying to load a JS chunk a newer deployment removed. If that
    // wasn't it, the reload flag prevents looping and we show the fallback.
    if (!sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1')
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background px-6 text-center">
          <p className="text-4xl">😵</p>
          <h1 className="text-lg font-semibold">Etwas ist schiefgelaufen</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Die Seite konnte nicht korrekt geladen werden. Das passiert manchmal direkt nach einem App-Update.
          </p>
          <Button
            onClick={() => {
              sessionStorage.removeItem(RELOAD_FLAG)
              window.location.reload()
            }}
          >
            <RefreshCw className="h-4 w-4" /> Seite neu laden
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
