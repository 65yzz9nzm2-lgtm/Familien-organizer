import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail } from 'lucide-react'
import { AuthLayout } from '@/components/layout/auth-layout'
import { GoogleIcon } from '@/components/shared/google-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authService } from '@/services/auth.service'
import { isSupabaseConfigured } from '@/lib/env'

const schema = z.object({
  email: z.string().email('Bitte gib eine gültige E-Mail-Adresse ein.'),
  password: z.string().min(6, 'Das Passwort muss mindestens 6 Zeichen haben.'),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  async function onSubmit(values: FormValues) {
    setError(null)
    try {
      await authService.signInWithEmail(values.email, values.password)
      navigate(from, { replace: true })
    } catch {
      setError('E-Mail oder Passwort ist falsch. Bitte versuche es erneut.')
    }
  }

  async function onGoogleLogin() {
    setError(null)
    setGoogleLoading(true)
    try {
      await authService.signInWithGoogle()
    } catch {
      setError('Die Anmeldung mit Google ist gerade nicht möglich.')
      setGoogleLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h2 className="mb-6 text-center text-lg font-semibold">Willkommen zurück</h2>

      {!isSupabaseConfigured && (
        <div className="mb-4 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground">
          Supabase ist noch nicht konfiguriert. Trage <code>VITE_SUPABASE_URL</code> und{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env.local</code> ein (siehe README).
        </div>
      )}

      <Button type="button" variant="outline" className="w-full" onClick={onGoogleLogin} disabled={googleLoading}>
        <GoogleIcon /> Mit Google anmelden
      </Button>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">oder</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-Mail</Label>
          <Input id="email" type="email" placeholder="du@familie.de" autoComplete="email" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Passwort</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Passwort vergessen?
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          <Mail className="h-4 w-4" /> Mit E-Mail anmelden
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Noch kein Konto?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Konto erstellen
        </Link>
      </p>
    </AuthLayout>
  )
}
