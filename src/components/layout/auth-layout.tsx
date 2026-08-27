import type { ReactNode } from 'react'
import { Home } from 'lucide-react'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Home className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">FamilyHub</h1>
          <p className="text-sm text-muted-foreground">Eure Familie. Euer Alltag. Alles an einem Ort.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">{children}</div>
      </div>
    </div>
  )
}
