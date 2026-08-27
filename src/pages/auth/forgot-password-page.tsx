import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { AuthLayout } from '@/components/layout/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authService } from '@/services/auth.service'

const schema = z.object({ email: z.string().email('Bitte gib eine gültige E-Mail-Adresse ein.') })
type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    try {
      await authService.requestPasswordReset(values.email)
    } finally {
      // Always show the same confirmation, regardless of whether the email
      // exists, so we don't leak which addresses have an account.
      setSent(true)
    }
  }

  return (
    <AuthLayout>
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <h2 className="text-lg font-semibold">E-Mail unterwegs</h2>
          <p className="text-sm text-muted-foreground">
            Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir einen Link zum Zurücksetzen deines
            Passworts geschickt.
          </p>
        </div>
      ) : (
        <>
          <h2 className="mb-2 text-center text-lg font-semibold">Passwort vergessen</h2>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Gib deine E-Mail-Adresse ein und wir schicken dir einen Link zum Zurücksetzen.
          </p>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              Link zum Zurücksetzen senden
            </Button>
          </form>
        </>
      )}

      <Link to="/login" className="mt-6 flex items-center justify-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> Zurück zur Anmeldung
      </Link>
    </AuthLayout>
  )
}
