import { NavLink } from 'react-router-dom'
import { Home } from 'lucide-react'
import { NAV_ITEMS } from '@/lib/nav-config'
import { cn } from '@/lib/utils'
import { useFamily } from '@/contexts/family-context'

export function Sidebar() {
  const { family } = useFamily()

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Home className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none">FamilyHub</p>
          {family && <p className="mt-1 text-xs text-muted-foreground">{family.name}</p>}
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                isActive && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
              )
            }
          >
            <item.icon className="h-4.5 w-4.5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
