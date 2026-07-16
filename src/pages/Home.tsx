import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GAMES } from '@/lib/games'
import { formatINR } from '@/lib/format'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { useAppStore } from '@/stores/appStore'
import { useState } from 'react'

export function Home() {
  const wallet = useAppStore((s) => s.wallet)
  const profile = useAppStore((s) => s.profile)
  const refresh = useAppStore((s) => s.refresh)
  const [bonusMsg, setBonusMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function claimBonus() {
    setBusy(true)
    setBonusMsg(null)
    try {
      const res = await api.claimDailyBonus()
      setBonusMsg(`+${formatINR(res.bonus)} pocket bonus claimed!`)
      await refresh()
    } catch (e) {
      setBonusMsg(e instanceof Error ? e.message : 'Could not claim')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-violet-600/40 via-fuchsia-500/10 to-cyan-400/10 p-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="font-display text-xs uppercase tracking-[0.22em] text-violet-200/80">
            LuckPocket
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight">
            Play the grid.
            <br />
            <span className="neon-text">One shared pocket.</span>
          </h1>
          <p className="mt-2 max-w-xs text-sm text-slate-300">
            Hey {profile?.username ?? 'player'} — {formatINR(wallet?.pocket_balance ?? 0)} ready to
            wager.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => void claimBonus()}>
              Daily bonus
            </Button>
            <Link to="/bank">
              <Button size="sm" variant="secondary">
                Bank {formatINR(wallet?.bank_balance ?? 0, true)}
              </Button>
            </Link>
            <Link to="/history">
              <Button size="sm" variant="ghost">
                History
              </Button>
            </Link>
          </div>
          {bonusMsg && <p className="mt-3 text-xs text-amber-200">{bonusMsg}</p>}
        </motion.div>
        <motion.div
          aria-hidden
          animate={{ rotate: [0, 8, -6, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute -right-6 -top-4 text-8xl opacity-30"
        >
          ₹
        </motion.div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-lg font-bold">Mini-games</h2>
          <Link to="/quests" className="text-xs font-semibold text-cyan-300">
            Daily quests →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {GAMES.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/game/${game.id}`}
                className={`block overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${game.accent} p-4 transition hover:border-violet-300/40`}
              >
                <div className="text-3xl">{game.emoji}</div>
                <h3 className="mt-2 font-display text-base font-bold">{game.name}</h3>
                <p className="mt-1 text-xs text-slate-300">{game.blurb}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <p className="pb-2 text-center text-[11px] text-slate-500">
        For entertainment only — no real money involved.
      </p>
    </div>
  )
}
