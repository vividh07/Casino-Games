import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { BetSelector } from '@/components/ui/BetSelector'
import { Button } from '@/components/ui/Button'
import { WinCard } from '@/components/ui/WinCard'
import { GameShell } from './GameShell'
import { usePlayGame } from '@/hooks/usePlayGame'
import { formatINR, formatMult } from '@/lib/format'

export function Crash() {
  const [bet, setBet] = useState(100)
  const [liveMult, setLiveMult] = useState(1)
  const [flying, setFlying] = useState(false)
  const cashoutRef = useRef(1.5)
  const resolvedRef = useRef(false)
  const { busy, error, result, showWinCard, setShowWinCard, play, setResult } = usePlayGame('crash')

  useEffect(() => {
    if (!flying) return
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const elapsed = (t - start) / 1000
      const m = Math.min(50, Math.pow(Math.E, elapsed * 0.45))
      setLiveMult(Math.round(m * 100) / 100)
      cashoutRef.current = Math.round(m * 100) / 100
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [flying])

  async function resolve(cashout: number) {
    if (resolvedRef.current) return
    resolvedRef.current = true
    setFlying(false)
    await play(bet, { cashout })
  }

  async function startRound() {
    setResult(null)
    resolvedRef.current = false
    setFlying(true)
    setLiveMult(1)
    const wait = 900 + Math.random() * 1800
    await new Promise((r) => setTimeout(r, wait))
    if (!resolvedRef.current) {
      await resolve(cashoutRef.current)
    }
  }

  return (
    <GameShell title="Crash">
      <div className="glass rounded-3xl p-4">
        <div className="relative mb-4 h-40 overflow-hidden rounded-2xl bg-gradient-to-t from-emerald-500/10 to-black/40">
          <motion.div
            animate={flying ? { x: [0, 180], y: [80, 10] } : { x: 0, y: 80 }}
            transition={{ duration: flying ? 4 : 0.3, ease: 'easeOut' }}
            className="absolute left-6 text-4xl"
          >
            🚀
          </motion.div>
          <p className="absolute inset-x-0 top-4 text-center font-display text-4xl font-bold text-emerald-300">
            {formatMult(result ? Number(result.details.crash_at ?? result.multiplier) : liveMult)}
          </p>
          {result && (
            <p className="absolute inset-x-0 bottom-3 text-center text-xs text-slate-300">
              Crashed at {formatMult(Number(result.details.crash_at))} · cashout{' '}
              {formatMult(Number(result.details.cashout))}
            </p>
          )}
        </div>

        <BetSelector bet={bet} onChange={setBet} disabled={busy || flying} />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button disabled={busy || flying || bet < 10} onClick={() => void startRound()}>
            {busy ? 'Resolving…' : 'Launch'}
          </Button>
          <Button
            variant="gold"
            disabled={!flying || busy}
            onClick={() => void resolve(cashoutRef.current)}
          >
            Cash Out
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        {result && (
          <p className="mt-3 text-center text-sm font-semibold capitalize">
            {result.outcome} · {formatINR(result.payout)}
          </p>
        )}
      </div>
      {showWinCard && result && (
        <WinCard
          game="crash"
          bet={bet}
          payout={result.payout}
          multiplier={result.multiplier}
          onClose={() => setShowWinCard(false)}
        />
      )}
    </GameShell>
  )
}
