import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './Button'

/**
 * Root error boundary.
 *
 * Without one, a thrown error unmounts the whole React tree and the person sees
 * a blank white page with no explanation -- and in this app that happens while
 * they have a resume they have been typing for twenty minutes.
 *
 * So the recovery offered here is not "reload": it is "download your work
 * first". The resume lives in this browser and nowhere else, and a reload on a
 * broken state is exactly when it could be lost.
 */

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // No telemetry: nothing about this resume leaves the machine. The console
    // is where the person (or whoever helps them) can find the detail.
    console.error('CV Match se rompió:', error, info.componentStack)
  }

  private rescue(): void {
    try {
      const raw = localStorage.getItem('cv-match:document')
      if (!raw) return
      const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = 'cv-match-recuperado.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch {
      /* if storage is unreachable there is nothing to rescue */
    }
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children

    return (
      <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center gap-4 px-6 py-16">
        <h1 className="text-xl font-semibold">Se rompió algo</h1>
        <p className="text-sm text-muted-foreground">
          La aplicación se cortó por un error nuestro, no por algo que hayas hecho mal. Tu CV sigue
          guardado en este navegador.
        </p>
        <p className="text-sm text-muted-foreground">
          Bajate una copia antes de recargar: es la forma segura de no perder nada.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => this.rescue()}>
            Bajar una copia de mi CV
          </Button>
          <Button onClick={() => window.location.reload()}>Recargar</Button>
        </div>
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          {this.state.error.message}
        </pre>
      </main>
    )
  }
}
