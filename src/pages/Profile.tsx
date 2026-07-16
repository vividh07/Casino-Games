import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { useAppStore } from '@/stores/appStore'

export function Profile() {
  const navigate = useNavigate()
  const profile = useAppStore((s) => s.profile)
  const wallet = useAppStore((s) => s.wallet)
  const achievements = useAppStore((s) => s.achievements)
  const refresh = useAppStore((s) => s.refresh)
  const signOut = useAppStore((s) => s.signOut)
  const [username, setUsername] = useState(profile?.username ?? '')
  const [msg, setMsg] = useState<string | null>(null)

  async function saveName() {
    setMsg(null)
    try {
      await api.updateUsername(username)
      await refresh()
      setMsg('Username updated')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Profile</h1>

      <section className="glass rounded-3xl p-4 space-y-3">
        <label className="block text-sm text-slate-300">
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
          />
        </label>
        <Button size="sm" onClick={() => void saveName()}>
          Save
        </Button>
        {msg && <p className="text-xs text-amber-200">{msg}</p>}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="glass rounded-3xl p-4">
          <p className="text-xs text-slate-400">Total wagered</p>
          <p className="font-display text-xl font-bold">{formatINR(profile?.total_wagered ?? 0)}</p>
        </div>
        <div className="glass rounded-3xl p-4">
          <p className="text-xs text-slate-400">Total won</p>
          <p className="font-display text-xl font-bold text-emerald-300">
            {formatINR(profile?.total_won ?? 0)}
          </p>
        </div>
        <div className="glass rounded-3xl p-4">
          <p className="text-xs text-slate-400">Best streak</p>
          <p className="font-display text-xl font-bold text-amber-300">{profile?.best_streak ?? 0}</p>
        </div>
        <div className="glass rounded-3xl p-4">
          <p className="text-xs text-slate-400">Net chips</p>
          <p className="font-display text-xl font-bold">
            {formatINR((wallet?.pocket_balance ?? 0) + (wallet?.bank_balance ?? 0))}
          </p>
        </div>
      </section>

      <section className="glass rounded-3xl p-4">
        <h2 className="font-display font-bold">Achievements</h2>
        <ul className="mt-3 space-y-2">
          {achievements.map((a) => (
            <li key={a.id} className="rounded-2xl bg-white/5 px-3 py-2 text-sm">
              🏅 {a.title}
            </li>
          ))}
          {!achievements.length && (
            <p className="text-sm text-slate-400">Win a Blackjack hand or pay off a loan to earn badges.</p>
          )}
        </ul>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link to="/settings">
          <Button variant="secondary">Settings</Button>
        </Link>
        <Link to="/history">
          <Button variant="ghost">History</Button>
        </Link>
        <Button
          variant="danger"
          onClick={() => {
            void signOut().then(() => navigate('/login'))
          }}
        >
          Log out
        </Button>
      </div>

      <p className="text-center text-[11px] text-slate-500">
        For entertainment only — no real money involved.
      </p>
    </div>
  )
}
