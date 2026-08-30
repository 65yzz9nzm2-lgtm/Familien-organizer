import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/components/layout/protected-route'
import { OnboardingGate } from '@/components/layout/onboarding-gate'
import { AppLayout } from '@/components/layout/app-layout'
import { FullScreenSpinner } from '@/components/shared/full-screen-spinner'
import { lazyWithReload as lazy } from '@/lib/lazy-with-reload'

import LoginPage from '@/pages/auth/login-page'
import RegisterPage from '@/pages/auth/register-page'
import ForgotPasswordPage from '@/pages/auth/forgot-password-page'
import ResetPasswordPage from '@/pages/auth/reset-password-page'

import OnboardingWelcomePage from '@/pages/onboarding/onboarding-welcome-page'
import CreateFamilyPage from '@/pages/onboarding/create-family-page'
import JoinFamilyPage from '@/pages/onboarding/join-family-page'

import DashboardPage from '@/pages/dashboard/dashboard-page'

// Lazily loaded: everything past the dashboard is code-split so the initial
// bundle stays small and each module only loads when a user visits it.
const FinanceLayout = lazy(() => import('@/pages/finances/finance-layout'))
const FinanceOverviewPage = lazy(() => import('@/pages/finances/overview-page'))
const ExpensesPage = lazy(() => import('@/pages/finances/expenses-page'))
const IncomePage = lazy(() => import('@/pages/finances/income-page'))
const RecurringPage = lazy(() => import('@/pages/finances/recurring-page'))
const AnnualCostsPage = lazy(() => import('@/pages/finances/annual-costs-page'))
const BudgetsPage = lazy(() => import('@/pages/finances/budgets-page'))
const StatisticsPage = lazy(() => import('@/pages/finances/statistics-page'))

const CalendarPage = lazy(() => import('@/pages/calendar/calendar-page'))
const MealPlanPage = lazy(() => import('@/pages/meals/meal-plan-page'))
const RecipesPage = lazy(() => import('@/pages/meals/recipes-page'))
const ShoppingPage = lazy(() => import('@/pages/shopping/shopping-page'))
const TasksPage = lazy(() => import('@/pages/tasks/tasks-page'))
const GoalsPage = lazy(() => import('@/pages/goals/goals-page'))
const DocumentsPage = lazy(() => import('@/pages/documents/documents-page'))
const BirthdaysPage = lazy(() => import('@/pages/birthdays/birthdays-page'))
const ChatPage = lazy(() => import('@/pages/chat/chat-page'))
const FamilyPage = lazy(() => import('@/pages/family/family-page'))
const ProfilePage = lazy(() => import('@/pages/profile/profile-page'))
const SettingsPage = lazy(() => import('@/pages/settings/settings-page'))

export default function App() {
  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<OnboardingGate />}>
            <Route path="/onboarding" element={<OnboardingWelcomePage />} />
            <Route path="/onboarding/create" element={<CreateFamilyPage />} />
            <Route path="/onboarding/join" element={<JoinFamilyPage />} />

            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />

              <Route path="/finanzen" element={<FinanceLayout />}>
                <Route index element={<FinanceOverviewPage />} />
                <Route path="ausgaben" element={<ExpensesPage />} />
                <Route path="einnahmen" element={<IncomePage />} />
                <Route path="fixkosten" element={<RecurringPage />} />
                <Route path="jahreskosten" element={<AnnualCostsPage />} />
                <Route path="budgets" element={<BudgetsPage />} />
                <Route path="statistik" element={<StatisticsPage />} />
              </Route>

              <Route path="/kalender" element={<CalendarPage />} />
              <Route path="/essen" element={<MealPlanPage />} />
              <Route path="/rezepte" element={<RecipesPage />} />
              <Route path="/einkauf" element={<ShoppingPage />} />
              <Route path="/aufgaben" element={<TasksPage />} />
              <Route path="/ziele" element={<GoalsPage />} />
              <Route path="/dokumente" element={<DocumentsPage />} />
              <Route path="/geburtstage" element={<BirthdaysPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/familie" element={<FamilyPage />} />
              <Route path="/profil" element={<ProfilePage />} />
              <Route path="/einstellungen" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
