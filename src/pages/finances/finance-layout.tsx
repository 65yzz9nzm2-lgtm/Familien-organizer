import { NavLink, Outlet } from 'react-router-dom'
import { FINANCE_TABS } from '@/lib/nav-config'
import { cn } from '@/lib/utils'

export default function FinanceLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finanzen</h1>
        <p className="text-sm text-muted-foreground">Ausgaben, Einnahmen und Budgets im Überblick</p>
      </div>

      <div className="scrollbar-none flex gap-1 overflow-x-auto border-b border-border">
        {FINANCE_TABS.map((tab) => (
          <NavLink
            key={tab.href}
            to={tab.href}
            end={tab.href === '/finanzen'}
            className={({ isActive }) =>
              cn(
                'whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                isActive && 'border-primary text-primary',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  )
}
