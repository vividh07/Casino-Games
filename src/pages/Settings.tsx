import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { useAppStore } from '@/stores/appStore'

export function Settings() {
  const settings = useAppStore((s) => s.settings)
  const refresh = useAppStore((s) => s.refresh)
  const [sound, setSound] = useState(settings?.sound_enabled ?? true)
  const [limitEnabled, setLimitEnabled] = useState(settings?.daily_loss_limit != null)
  const [limit, setLimit] = useState(settings?.daily_loss_limit ?? 2000)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    setMsg(null)
    try {
      await api.updateSettings(sound, limitEnabled ? limit : null)
      await refresh()
      setMsg('Settings saved')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Link to="/profile" className="text-xs text-slate-400">
        ← Profile
      </Link>
      <h1 className="font-display text-2xl font-bold">Settings</h1>

      <section className="glass rounded-3xl p-4 space-y-4">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Sound effects</span>
          <input
            type="checkbox"
            checked={sound}
            onChange={(e) => setSound(e.target.checked)}
            className="h-5 w-5 accent-violet-500"
          />
        </label>

        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Daily loss limit</span>
          <input
            type="checkbox"
            checked={limitEnabled}
            onChange={(e) => setLimitEnabled(e.target.checked)}
            className="h-5 w-5 accent-violet-500"
          />
        </label>

        {limitEnabled && (
          <label className="block text-sm text-slate-300">
            Max net loss / day (virtual ₹)
            <input
              type="number"
              min={100}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
            />
          </label>
        )}

        <Button disabled={busy} onClick={() => void save()}>
          {busy ? 'Saving…' : 'Save settings'}
        </Button>
        {msg && <p className="text-sm text-amber-200">{msg}</p>}
      </section>

      <p className="text-xs text-slate-500">
        Loss limits pause betting for the day once hit. You can raise or remove the cap anytime.
      </p>
    </div>
  )
}
