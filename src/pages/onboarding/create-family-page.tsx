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
import { Select } from '@/components/ui/select'
import { useAuth } from '@/contexts/auth-context'
import { useFamily } from '@/contexts/family-context'
import { familyService } from '@/services/family.service'

const schema = z.object({
  name: z.string().min(2, 'Bitte gib einen Familiennamen ein.'),
  country: z.string().min(1),
  currency: z.string().min(1),
})

type FormValues = z.infer<typeof schema>

const COLORS = ['#6366f1', '#ec4899', '#22c55e', '#f97316', '#0ea5e9', '#a855f7']

export default function CreateFamilyPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { refresh } = useFamily()
  const [color, setColor] = useState(COLORS[0])
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { country: 'DE', currency: 'EUR' },
  })

  async function onSubmit(values: FormValues) {
    if (!user) return
    setError(null)
    try {
      await familyService.createFamily({ ...values, color })
      await refresh()
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Die Familie konnte nicht erstellt werden. Bitte versuche es erneut.')
    }
  }

  return (
    <AuthLayout>
      <h2 className="mb-6 text-center text-lg font-semibold">Neue Familie erstellen</h2>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="name">Familienname</Label>
          <Input id="name" placeholder="Familie Müller" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Familienfarbe</Label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Farbe ${c} auswählen`}
                className="h-8 w-8 rounded-full ring-offset-2 transition-shadow"
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="country">Land</Label>
            <Select id="country" {...register('country')}>
              <option value="DE">Deutschland</option>
              <option value="AT">Österreich</option>
              <option value="CH">Schweiz</option>
              <option value="IT">Italien</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Währung</Label>
            <Select id="currency" {...register('currency')}>
              <option value="EUR">EUR (€)</option>
              <option value="CHF">CHF</option>
              <option value="USD">USD ($)</option>
            </Select>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          Familie erstellen
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
