import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Sun, Moon, Monitor, LogOut, User as UserIcon } from 'lucide-react'
import { useTheme } from '@/contexts/theme-context'
import { useAuth } from '@/contexts/auth-context'
import { useFamily } from '@/contexts/family-context'
import { authService } from '@/services/auth.service'
import { Avatar } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor } as const

export function Topbar() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const { membership } = useFamily()
  const [menuOpen, setMenuOpen] = useState(false)
  const ThemeIcon = THEME_ICONS[theme]

  function cycleTheme() {
    setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')
  }

  const displayName = membership?.display_name ?? (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? ''

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/60 px-4 backdrop-blur lg:px-6">
      <div className="relative hidden flex-1 max-w-sm sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Suchen…" className="h-9 pl-9" />
      </div>
      <div className="flex-1 sm:hidden" />

      <button
        onClick={cycleTheme}
        aria-label="Design wechseln"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
      >
        <ThemeIcon className="h-4.5 w-4.5" />
      </button>

      <div className="relative">
        <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2">
          <Avatar name={displayName || 'Ich'} color={membership?.color} src={membership?.avatar_url} className="h-9 w-9" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-border bg-card p-1.5 shadow-lg">
              <p className="truncate px-2.5 py-1.5 text-xs text-muted-foreground">{displayName}</p>
              <Link
                to="/profil"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-muted"
              >
                <UserIcon className="h-4 w-4" /> Profil
              </Link>
              <button
                onClick={() => authService.signOut()}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" /> Abmelden
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
