import { useEffect, useState } from 'react'
import { Loader2, Moon, Sun, Monitor } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useAuth } from '@/contexts/auth-context'
import { useTheme, type Theme } from '@/contexts/theme-context'
import { settingsService } from '@/services/settings.service'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database.types'

const NOTIFICATION_LABELS: Record<string, string> = {
  tasks: 'Aufgaben',
  calendar: 'Kalender',
  birthdays: 'Geburtstage',
  bills: 'Rechnungen',
  chat: 'Chat',
}

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Hell', icon: Sun },
  { value: 'dark', label: 'Dunkel', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState<Tables<'user_settings'> | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    settingsService.getUserSettings(user.id).then(setSettings)
  }, [user])

  if (!user) return null

  async function togglePref(key: string) {
    if (!settings || !user) return
    const next = { ...settings.notification_prefs, [key]: !settings.notification_prefs[key] }
    setSettings({ ...settings, notification_prefs: next })
    await settingsService.updateUserSettings(user.id, { notification_prefs: next })
  }

  async function handleCurrencyChange(currency: string) {
    if (!user) return
    setSaving(true)
    try {
      await settingsService.updateUserSettings(user.id, { currency })
      setSettings((s) => (s ? { ...s, currency } : s))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>

      <Card>
        <CardHeader>
          <CardTitle>Design</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          {THEME_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={theme === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme(opt.value)}
              className={cn('flex-1')}
            >
              <opt.icon className="h-4 w-4" /> {opt.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sprache & Währung</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Select value={settings?.locale ?? 'de-DE'} disabled>
            <option value="de-DE">Deutsch</option>
          </Select>
          <Select value={settings?.currency ?? 'EUR'} onChange={(e) => handleCurrencyChange(e.target.value)} disabled={saving}>
            <option value="EUR">EUR (€)</option>
            <option value="CHF">CHF</option>
            <option value="USD">USD ($)</option>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Benachrichtigungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {settings ? (
            Object.entries(NOTIFICATION_LABELS).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                {label}
                <input
                  type="checkbox"
                  checked={Boolean(settings.notification_prefs[key])}
                  onChange={() => togglePref(key)}
                  className="h-4 w-4 accent-primary"
                />
              </label>
            ))
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
