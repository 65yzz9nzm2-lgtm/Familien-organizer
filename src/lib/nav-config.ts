import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Wallet,
  CalendarDays,
  UtensilsCrossed,
  ShoppingCart,
  ListChecks,
  PiggyBank,
  FolderOpen,
  Cake,
  MessageCircle,
  Users,
  Settings,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Shown in the 4-item mobile bottom bar (the 5th slot is always "Mehr"). */
  inBottomNav?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Start', href: '/dashboard', icon: LayoutDashboard, inBottomNav: true },
  { label: 'Finanzen', href: '/finanzen', icon: Wallet, inBottomNav: true },
  { label: 'Kalender', href: '/kalender', icon: CalendarDays, inBottomNav: true },
  { label: 'Essen', href: '/essen', icon: UtensilsCrossed, inBottomNav: true },
  { label: 'Einkauf', href: '/einkauf', icon: ShoppingCart },
  { label: 'Aufgaben', href: '/aufgaben', icon: ListChecks },
  { label: 'Ziele', href: '/ziele', icon: PiggyBank },
  { label: 'Dokumente', href: '/dokumente', icon: FolderOpen },
  { label: 'Geburtstage', href: '/geburtstage', icon: Cake },
  { label: 'Chat', href: '/chat', icon: MessageCircle },
  { label: 'Familie', href: '/familie', icon: Users },
  { label: 'Einstellungen', href: '/einstellungen', icon: Settings },
]

export const FINANCE_TABS = [
  { label: 'Übersicht', href: '/finanzen' },
  { label: 'Ausgaben', href: '/finanzen/ausgaben' },
  { label: 'Einnahmen', href: '/finanzen/einnahmen' },
  { label: 'Fixkosten', href: '/finanzen/fixkosten' },
  { label: 'Fixe Einnahmen', href: '/finanzen/fixe-einnahmen' },
  { label: 'Budgets', href: '/finanzen/budgets' },
  { label: 'Statistik', href: '/finanzen/statistik' },
]
