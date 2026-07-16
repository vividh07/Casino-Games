import { useState } from 'react'
import { motion } from 'framer-motion'
import { BetSelector } from '@/components/ui/BetSelector'
import { Button } from '@/components/ui/Button'
import { WinCard } from '@/components/ui/WinCard'
import { GameShell } from './GameShell'
import { usePlayGame } from '@/hooks/usePlayGame'
import { formatINR } from '@/lib/format'

const SEGMENTS = [0, 1.2, 1.5, 2, 3, 5, 10, 0]

export function WheelSpin() {
  const [bet, setBet] = useState(100)
  const [rotation, setRotation] = useState(0)
  const { busy, error, result, showWinCard, setShowWinCard, play } = usePlayGame('wheel')

  async function spin() {
    const res = await play(bet)
    const mult = Number(res.details.multiplier ?? 0)
    const idx = Math.max(0, SEGMENTS.findIndex((s) => s === mult))
    const slice = 360 / SEGMENTS.length
    const target = 1800 + (360 - idx * slice) - slice / 2
    setRotation(target)
  }

  return (
    <GameShell title="Wheel Spin">
      <div className="glass rounded-3xl p-4">
        <div className="relative mx-auto mb-4 flex h-56 w-56 items-center justify-center">
          <div className="absolute top-0 z-10 h-0 w-0 border-l-8 border-r-8 border-t-[16px] border-l-transparent border-r-transparent border-t-amber-300" />
          <motion.div
            animate={{ rotate: rotation }}
            transition={{ duration: 3.2, ease: [0.15, 0.8, 0.2, 1] }}
            className="h-52 w-52 rounded-full border-4 border-white/20 shadow-[0_0_40px_rgba(168,85,247,0.35)]"
            style={{
              background:
                'conic-gradient(#a855f7 0deg 45deg, #22d3ee 45deg 90deg, #fbbf24 90deg 135deg, #4ade80 135deg 180deg, #f43f5e 180deg 225deg, #818cf8 225deg 270deg, #f472b6 270deg 315deg, #34d399 315deg 360deg)',
            }}
          />
          <div className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-ink font-display text-sm font-bold">
            SPIN
          </div>
        </div>

        {result && (
          <p className="mb-3 text-center font-display text-2xl font-bold text-amber-300">
            {Number(result.details.multiplier)}x · {formatINR(result.payout)}
          </p>
        )}

        <BetSelector bet={bet} onChange={setBet} disabled={busy} />
        <Button className="mt-4 w-full" disabled={busy || bet < 10} onClick={() => void spin()}>
          {busy ? 'Spinning…' : 'Spin'}
        </Button>
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      </div>
      {showWinCard && result && (
        <WinCard
          game="wheel"
          bet={bet}
          payout={result.payout}
          multiplier={result.multiplier}
          onClose={() => setShowWinCard(false)}
        />
      )}
    </GameShell>
  )
}
