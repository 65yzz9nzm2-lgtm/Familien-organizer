import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { AuthLayout } from '@/components/layout/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFamily } from '@/contexts/family-context'
import { familyService } from '@/services/family.service'

const schema = z.object({ code: z.string().min(6, 'Der Einladungscode ist zu kurz.') })
type FormValues = z.infer<typeof schema>

export default function JoinFamilyPage() {
  const navigate = useNavigate()
  const { refresh } = useFamily()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setError(null)
    try {
      await familyService.joinByCode(values.code)
      await refresh()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('already_member')) setError('Du bist bereits Mitglied dieser Familie.')
      else setError('Dieser Einladungscode ist ungültig oder abgelaufen.')
    }
  }

  return (
    <AuthLayout>
      <h2 className="mb-2 text-center text-lg font-semibold">Familie beitreten</h2>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Gib den Einladungscode ein, den du von einem Familienmitglied erhalten hast.
      </p>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="code">Einladungscode</Label>
          <Input id="code" placeholder="z. B. A1B2C3D4E5" className="uppercase tracking-widest" {...register('code')} />
          {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          Beitreten
        </Button>
      </form>
      <Link
        to="/onboarding"
        className="mt-6 flex items-center justify-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Zurück
      </Link>
    </AuthLayout>
  )
}
