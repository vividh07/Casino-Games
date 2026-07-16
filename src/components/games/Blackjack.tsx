import { useState } from 'react'
import { motion } from 'framer-motion'
import { BetSelector } from '@/components/ui/BetSelector'
import { Button } from '@/components/ui/Button'
import { WinCard } from '@/components/ui/WinCard'
import { GameShell } from './GameShell'
import { usePlayGame } from '@/hooks/usePlayGame'
import { formatINR } from '@/lib/format'

export function Blackjack() {
  const [bet, setBet] = useState(100)
  const { busy, error, result, showWinCard, setShowWinCard, play } = usePlayGame('blackjack')

  const player = result?.details.player as number | undefined
  const dealer = result?.details.dealer as number | undefined

  return (
    <GameShell title="Blackjack">
      <div className="glass rounded-3xl p-4">
        <div className="mb-4 grid grid-cols-2 gap-3">
          <motion.div
            key={`d-${dealer}-${result?.payout}`}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            className="rounded-2xl bg-black/30 p-4 text-center"
          >
            <p className="text-xs text-slate-400">Dealer</p>
            <p className="font-display text-4xl font-bold text-rose-300">{dealer ?? '—'}</p>
          </motion.div>
          <motion.div
            key={`p-${player}-${result?.payout}`}
            initial={{ rotateY: -90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            className="rounded-2xl bg-black/30 p-4 text-center"
          >
            <p className="text-xs text-slate-400">You</p>
            <p className="font-display text-4xl font-bold text-cyan-300">{player ?? '—'}</p>
          </motion.div>
        </div>

        <BetSelector bet={bet} onChange={setBet} disabled={busy} />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button disabled={busy || bet < 10} onClick={() => void play(bet, { double: false })}>
            {busy ? 'Dealing…' : 'Play'}
          </Button>
          <Button
            variant="gold"
            disabled={busy || bet < 10}
            onClick={() => void play(bet, { double: true })}
          >
            Double
          </Button>
        </div>

        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        {result && (
          <p className="mt-3 text-center text-sm">
            <span className="uppercase tracking-wide text-slate-400">{result.outcome}</span>
            {' · '}
            <span className="font-bold text-amber-300">{formatINR(result.payout)}</span>
          </p>
        )}
      </div>

      {showWinCard && result && (
        <WinCard
          game="blackjack"
          bet={bet}
          payout={result.payout}
          multiplier={result.multiplier}
          onClose={() => setShowWinCard(false)}
        />
      )}
    </GameShell>
  )
}
