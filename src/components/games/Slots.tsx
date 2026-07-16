import { useState } from 'react'
import { motion } from 'framer-motion'
import { BetSelector } from '@/components/ui/BetSelector'
import { Button } from '@/components/ui/Button'
import { WinCard } from '@/components/ui/WinCard'
import { GameShell } from './GameShell'
import { usePlayGame } from '@/hooks/usePlayGame'
import { SLOT_SYMBOLS } from '@/lib/games'
import { formatINR } from '@/lib/format'

export function Slots() {
  const [bet, setBet] = useState(100)
  const { busy, error, result, showWinCard, setShowWinCard, play } = usePlayGame('slots')
  const reels = (result?.details.reels as string[] | undefined) ?? ['seven', 'bell', 'cherry']

  return (
    <GameShell title="Neon Slots">
      <div className="glass rounded-3xl p-4">
        <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl bg-black/40 p-3">
          {reels.map((sym, i) => (
            <motion.div
              key={`${sym}-${i}-${result?.payout ?? 0}`}
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.12 }}
              className="flex h-24 items-center justify-center rounded-xl bg-gradient-to-b from-violet-500/30 to-transparent text-4xl"
            >
              {SLOT_SYMBOLS[sym] ?? '❓'}
            </motion.div>
          ))}
        </div>
        <p className="mb-3 text-center text-xs text-slate-400">
          3-of-a-kind pays · diamond 25x · seven 15x · bar 8x
        </p>
        <BetSelector bet={bet} onChange={setBet} disabled={busy} />
        <Button className="mt-4 w-full" disabled={busy || bet < 10} onClick={() => void play(bet)}>
          {busy ? 'Rolling…' : 'Spin Reels'}
        </Button>
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        {result && (
          <p className="mt-3 text-center text-sm font-semibold capitalize">
            {result.outcome} · {formatINR(result.payout)}
          </p>
        )}
      </div>
      {showWinCard && result && (
        <WinCard
          game="slots"
          bet={bet}
          payout={result.payout}
          multiplier={result.multiplier}
          onClose={() => setShowWinCard(false)}
        />
      )}
    </GameShell>
  )
}
