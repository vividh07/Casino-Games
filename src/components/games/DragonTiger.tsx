import { useState } from 'react'
import { motion } from 'framer-motion'
import { BetSelector } from '@/components/ui/BetSelector'
import { Button } from '@/components/ui/Button'
import { WinCard } from '@/components/ui/WinCard'
import { GameShell } from './GameShell'
import { usePlayGame } from '@/hooks/usePlayGame'
import { CARD_RANKS } from '@/lib/games'
import { formatINR } from '@/lib/format'

type Side = 'dragon' | 'tiger' | 'tie'

export function DragonTiger() {
  const [bet, setBet] = useState(100)
  const [side, setSide] = useState<Side>('dragon')
  const { busy, error, result, showWinCard, setShowWinCard, play } = usePlayGame('dragon_tiger')

  const d = result?.details.dragon as number | undefined
  const t = result?.details.tiger as number | undefined

  return (
    <GameShell title="Dragon Tiger">
      <div className="glass rounded-3xl p-4">
        <div className="mb-4 grid grid-cols-2 gap-3">
          <motion.div
            key={`d-${d}-${result?.payout}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-2xl bg-gradient-to-br from-red-500/30 to-transparent p-4 text-center"
          >
            <p className="text-xs text-rose-200">Dragon</p>
            <p className="font-display text-4xl font-bold">{d ? CARD_RANKS[d - 1] : '—'}</p>
          </motion.div>
          <motion.div
            key={`t-${t}-${result?.payout}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-2xl bg-gradient-to-br from-amber-500/30 to-transparent p-4 text-center"
          >
            <p className="text-xs text-amber-200">Tiger</p>
            <p className="font-display text-4xl font-bold">{t ? CARD_RANKS[t - 1] : '—'}</p>
          </motion.div>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2">
          {(['dragon', 'tiger', 'tie'] as Side[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={`rounded-2xl px-2 py-3 text-sm font-bold capitalize ${
                side === s ? 'bg-violet-500 text-white' : 'bg-white/10 text-slate-300'
              }`}
            >
              {s}
              {s === 'tie' ? ' 8:1' : ''}
            </button>
          ))}
        </div>

        <BetSelector bet={bet} onChange={setBet} disabled={busy} />
        <Button
          className="mt-4 w-full"
          disabled={busy || bet < 10}
          onClick={() => void play(bet, { side })}
        >
          {busy ? 'Dealing…' : `Bet on ${side}`}
        </Button>
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        {result && (
          <p className="mt-3 text-center text-sm font-semibold capitalize">
            {String(result.details.winner)} wins · {result.outcome} · {formatINR(result.payout)}
          </p>
        )}
      </div>
      {showWinCard && result && (
        <WinCard
          game="dragon_tiger"
          bet={bet}
          payout={result.payout}
          multiplier={result.multiplier}
          onClose={() => setShowWinCard(false)}
        />
      )}
    </GameShell>
  )
}
