import { useState } from 'react'
import { motion } from 'framer-motion'
import { BetSelector } from '@/components/ui/BetSelector'
import { Button } from '@/components/ui/Button'
import { WinCard } from '@/components/ui/WinCard'
import { GameShell } from './GameShell'
import { usePlayGame } from '@/hooks/usePlayGame'
import { CARD_RANKS } from '@/lib/games'
import { formatINR } from '@/lib/format'

function CardFace({ value }: { value: number }) {
  return (
    <div className="flex h-16 w-11 items-center justify-center rounded-xl bg-gradient-to-b from-white to-slate-200 font-display text-lg font-bold text-ink shadow-md">
      {CARD_RANKS[value - 1] ?? '?'}
    </div>
  )
}

export function Blackjack() {
  const [bet, setBet] = useState(100)
  const { busy, error, result, showWinCard, setShowWinCard, play } = usePlayGame('blackjack')

  const playerCards = (result?.details.player_cards as number[] | undefined) ?? []
  const dealerCards = (result?.details.dealer_cards as number[] | undefined) ?? []
  const player = result?.details.player as number | undefined
  const dealer = result?.details.dealer as number | undefined

  return (
    <GameShell title="Blackjack">
      <div className="glass rounded-3xl p-4">
        <div className="mb-4 space-y-4">
          <div>
            <p className="mb-2 text-xs text-slate-400">
              Dealer {dealer != null ? `· ${dealer}` : ''}
            </p>
            <div className="flex min-h-16 flex-wrap gap-2">
              {dealerCards.length
                ? dealerCards.map((c, i) => (
                    <motion.div
                      key={`d-${i}-${c}`}
                      initial={{ rotateY: 90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      transition={{ delay: i * 0.08 }}
                    >
                      <CardFace value={c} />
                    </motion.div>
                  ))
                : (
                  <div className="h-16 w-11 rounded-xl border border-dashed border-white/20" />
                )}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-slate-400">
              You {player != null ? `· ${player}` : ''}
            </p>
            <div className="flex min-h-16 flex-wrap gap-2">
              {playerCards.length
                ? playerCards.map((c, i) => (
                    <motion.div
                      key={`p-${i}-${c}`}
                      initial={{ rotateY: -90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      transition={{ delay: i * 0.08 }}
                    >
                      <CardFace value={c} />
                    </motion.div>
                  ))
                : (
                  <div className="h-16 w-11 rounded-xl border border-dashed border-white/20" />
                )}
            </div>
          </div>
        </div>

        <BetSelector bet={bet} onChange={setBet} disabled={busy} />

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Button
            variant="secondary"
            disabled={busy || bet < 10}
            onClick={() => void play(bet, { move: 'hit', double: false })}
          >
            Hit
          </Button>
          <Button
            disabled={busy || bet < 10}
            onClick={() => void play(bet, { move: 'stand', double: false })}
          >
            Stand
          </Button>
          <Button
            variant="gold"
            disabled={busy || bet < 10}
            onClick={() => void play(bet, { move: 'double', double: true })}
          >
            Double
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Outcomes dealt server-side · Hit draws to 17+ · Dealer stands on 17
        </p>

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
