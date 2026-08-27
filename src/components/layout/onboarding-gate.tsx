import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useFamily } from '@/contexts/family-context'
import { FullScreenSpinner } from '@/components/shared/full-screen-spinner'

// Redirects users without a family to /onboarding, and keeps users who
// already have a family out of the onboarding flow.
export function OnboardingGate() {
  const { membership, loading } = useFamily()
  const location = useLocation()

  if (loading) return <FullScreenSpinner />

  const onOnboardingRoute = location.pathname.startsWith('/onboarding')

  if (!membership && !onOnboardingRoute) {
    return <Navigate to="/onboarding" replace />
  }
  if (membership && onOnboardingRoute) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
