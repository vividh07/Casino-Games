import { useState } from 'react'
import { motion } from 'framer-motion'
import { BetSelector } from '@/components/ui/BetSelector'
import { Button } from '@/components/ui/Button'
import { WinCard } from '@/components/ui/WinCard'
import { GameShell } from './GameShell'
import { usePlayGame } from '@/hooks/usePlayGame'
import { formatINR } from '@/lib/format'

export function Poker() {
  const [bet, setBet] = useState(100)
  const { busy, error, result, showWinCard, setShowWinCard, play } = usePlayGame('poker')
  const ps = result?.details.player_score as number | undefined
  const hs = result?.details.house_score as number | undefined

  return (
    <GameShell title="Teen Patti">
      <div className="glass rounded-3xl p-4">
        <div className="mb-4 flex items-end justify-center gap-6 py-6">
          <motion.div
            animate={result ? { y: [0, -8, 0] } : {}}
            className="text-center"
          >
            <div className="mx-auto flex h-24 w-16 items-center justify-center rounded-xl bg-gradient-to-b from-rose-400 to-rose-700 font-display text-2xl font-bold shadow-lg">
              {hs ?? '?'}
            </div>
            <p className="mt-2 text-xs text-slate-400">House</p>
          </motion.div>
          <p className="pb-8 text-slate-500">VS</p>
          <motion.div
            animate={result ? { y: [0, -8, 0] } : {}}
            className="text-center"
          >
            <div className="mx-auto flex h-24 w-16 items-center justify-center rounded-xl bg-gradient-to-b from-cyan-300 to-violet-600 font-display text-2xl font-bold shadow-lg">
              {ps ?? '?'}
            </div>
            <p className="mt-2 text-xs text-slate-400">You</p>
          </motion.div>
        </div>

        <BetSelector bet={bet} onChange={setBet} disabled={busy} />
        <Button className="mt-4 w-full" disabled={busy || bet < 10} onClick={() => void play(bet)}>
          {busy ? 'Showing…' : 'Show Hand'}
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
          game="poker"
          bet={bet}
          payout={result.payout}
          multiplier={result.multiplier}
          onClose={() => setShowWinCard(false)}
        />
      )}
    </GameShell>
  )
}
