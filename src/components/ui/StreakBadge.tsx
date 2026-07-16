import { motion } from 'framer-motion'
import { streakBonus } from '@/lib/format'

export function StreakBadge({ streak }: { streak: number }) {
  if (streak <= 0) return null
  const bonus = streakBonus(streak)
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-200"
    >
      <span>🔥 {streak} streak</span>
      <span className="text-amber-100/80">+{Math.round(bonus * 100)}%</span>
    </motion.div>
  )
}
