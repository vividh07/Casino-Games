import { motion } from 'framer-motion'
import { formatINR, formatMult } from '@/lib/format'
import { gameLabel } from '@/lib/games'
import { Button } from './Button'

type Props = {
  game: string
  bet: number
  payout: number
  multiplier: number
  onClose: () => void
}

export function WinCard({ game, bet, payout, multiplier, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        className="glass w-full max-w-sm overflow-hidden rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-violet-600/50 via-fuchsia-500/30 to-amber-400/20 p-6">
          <p className="font-display text-xs uppercase tracking-[0.2em] text-violet-100">
            LuckPocket Win
          </p>
          <h3 className="mt-2 font-display text-3xl font-bold text-white">{gameLabel(game)}</h3>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] uppercase text-slate-300">Bet</p>
              <p className="font-bold text-white">{formatINR(bet)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-300">Mult</p>
              <p className="font-bold text-cyan-300">{formatMult(multiplier)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-300">Payout</p>
              <p className="font-bold text-amber-300">{formatINR(payout)}</p>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-slate-300">
            Screenshot & share — virtual chips only
          </p>
        </div>
        <div className="p-4">
          <Button className="w-full" onClick={onClose}>
            Nice
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
