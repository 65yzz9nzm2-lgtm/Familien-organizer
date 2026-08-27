import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, CheckCircle2 } from 'lucide-react'
import { AuthLayout } from '@/components/layout/auth-layout'
import { GoogleIcon } from '@/components/shared/google-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authService } from '@/services/auth.service'

const schema = z.object({
  fullName: z.string().min(2, 'Bitte gib deinen Namen ein.'),
  email: z.string().email('Bitte gib eine gültige E-Mail-Adresse ein.'),
  password: z.string().min(6, 'Das Passwort muss mindestens 6 Zeichen haben.'),
})

type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setError(null)
    try {
      const result = await authService.signUpWithEmail(values.email, values.password, values.fullName)
      if (result.session) {
        navigate('/onboarding', { replace: true })
      } else {
        setSubmitted(true)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      setError(
        message.toLowerCase().includes('already')
          ? 'Für diese E-Mail-Adresse existiert bereits ein Konto.'
          : 'Registrierung fehlgeschlagen. Bitte versuche es erneut.',
      )
    }
  }

  if (submitted) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <h2 className="text-lg font-semibold">Fast geschafft!</h2>
          <p className="text-sm text-muted-foreground">
            Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte klicke auf den Link darin, um dein Konto zu
            aktivieren.
          </p>
          <Link to="/login" className="mt-2 text-sm font-medium text-primary hover:underline">
            Zurück zur Anmeldung
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h2 className="mb-6 text-center text-lg font-semibold">Konto erstellen</h2>

      <Button type="button" variant="outline" className="w-full" onClick={() => authService.signInWithGoogle()}>
        <GoogleIcon /> Mit Google registrieren
      </Button>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">oder</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Name</Label>
          <Input id="fullName" autoComplete="name" {...register('fullName')} />
          {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-Mail</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Passwort</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          <UserPlus className="h-4 w-4" /> Konto erstellen
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Bereits ein Konto?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Anmelden
        </Link>
      </p>
    </AuthLayout>
  )
}
