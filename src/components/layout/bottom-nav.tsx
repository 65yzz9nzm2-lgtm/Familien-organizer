import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { NAV_ITEMS } from '@/lib/nav-config'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const primary = NAV_ITEMS.filter((i) => i.inBottomNav)
  const rest = NAV_ITEMS.filter((i) => !i.inBottomNav)

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-card p-4 pb-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Mehr</p>
              <button onClick={() => setMoreOpen(false)} aria-label="Schließen">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {rest.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-border p-3 text-xs font-medium text-muted-foreground"
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-border bg-card/95 py-2 backdrop-blur lg:hidden">
        {primary.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium text-muted-foreground',
                isActive && 'text-primary',
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium text-muted-foreground"
        >
          <Menu className="h-5 w-5" />
          Mehr
        </button>
      </nav>
    </>
  )
}
