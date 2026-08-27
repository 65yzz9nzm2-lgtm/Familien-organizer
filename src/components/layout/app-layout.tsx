import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'
import { Topbar } from '@/components/layout/topbar'

export function AppLayout() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-6 lg:px-8 lg:pb-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
