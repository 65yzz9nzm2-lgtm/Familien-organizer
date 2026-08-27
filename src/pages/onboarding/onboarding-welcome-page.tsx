import { useNavigate } from 'react-router-dom'
import { Users, KeyRound } from 'lucide-react'
import { AuthLayout } from '@/components/layout/auth-layout'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'

export default function OnboardingWelcomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0]

  return (
    <AuthLayout>
      <h2 className="mb-1 text-center text-lg font-semibold">
        Willkommen bei FamilyHub{firstName ? `, ${firstName}` : ''} 👋
      </h2>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Lege los, indem du eine neue Familie erstellst oder einer bestehenden beitrittst.
      </p>

      <div className="space-y-3">
        <Card
          className="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:border-primary"
          onClick={() => navigate('/onboarding/create')}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">Neue Familie erstellen</p>
            <p className="text-xs text-muted-foreground">Starte FamilyHub für deine Familie</p>
          </div>
        </Card>

        <Card
          className="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:border-primary"
          onClick={() => navigate('/onboarding/join')}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">Familie beitreten</p>
            <p className="text-xs text-muted-foreground">Mit Einladungscode oder Link beitreten</p>
          </div>
        </Card>
      </div>
    </AuthLayout>
  )
}
