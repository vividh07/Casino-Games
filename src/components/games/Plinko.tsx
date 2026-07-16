import { useState } from 'react'
import { motion } from 'framer-motion'
import { BetSelector } from '@/components/ui/BetSelector'
import { Button } from '@/components/ui/Button'
import { WinCard } from '@/components/ui/WinCard'
import { GameShell } from './GameShell'
import { usePlayGame } from '@/hooks/usePlayGame'
import { formatINR } from '@/lib/format'

const MULTS = [5, 2, 1.1, 0.5, 0.3, 0.5, 1.1, 2, 5]

export function Plinko() {
  const [bet, setBet] = useState(100)
  const { busy, error, result, showWinCard, setShowWinCard, play } = usePlayGame('plinko')
  const slot = result?.details.slot as number | undefined

  return (
    <GameShell title="Plinko">
      <div className="glass rounded-3xl p-4">
        <div className="relative mb-3 h-48 overflow-hidden rounded-2xl bg-black/30">
          <div className="absolute inset-x-6 top-4 grid grid-cols-7 gap-2 opacity-40">
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} className="h-2 w-2 justify-self-center rounded-full bg-violet-300" />
            ))}
          </div>
          {result && (
            <motion.div
              initial={{ y: -20, x: '45%' }}
              animate={{ y: 140, x: `${8 + (slot ?? 4) * 10}%` }}
              transition={{ duration: 1.1, ease: 'easeIn' }}
              className="absolute h-5 w-5 rounded-full bg-cyan-300 shadow-[0_0_20px_#22d3ee]"
            />
          )}
          <div className="absolute inset-x-2 bottom-2 grid grid-cols-9 gap-1">
            {MULTS.map((m, i) => (
              <div
                key={i}
                className={`rounded-md py-1 text-center text-[10px] font-bold ${
                  slot === i ? 'bg-amber-400 text-ink' : 'bg-white/10 text-slate-300'
                }`}
              >
                {m}x
              </div>
            ))}
          </div>
        </div>

        <BetSelector bet={bet} onChange={setBet} disabled={busy} />
        <Button className="mt-4 w-full" disabled={busy || bet < 10} onClick={() => void play(bet)}>
          {busy ? 'Dropping…' : 'Drop Ball'}
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
          game="plinko"
          bet={bet}
          payout={result.payout}
          multiplier={result.multiplier}
          onClose={() => setShowWinCard(false)}
        />
      )}
    </GameShell>
  )
}
