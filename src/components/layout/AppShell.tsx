import { Link, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BottomNav } from './BottomNav'
import { formatINR } from '@/lib/format'
import { StreakBadge } from '@/components/ui/StreakBadge'
import { useAppStore } from '@/stores/appStore'
import { api } from '@/lib/api'

export function AppShell() {
  const location = useLocation()
  const wallet = useAppStore((s) => s.wallet)
  const profile = useAppStore((s) => s.profile)
  const jackpot = useAppStore((s) => s.jackpot)

  return (
    <div className="mx-auto min-h-screen max-w-lg">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a12]/75 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="font-display text-xl font-bold tracking-tight">
            <span className="neon-text">LuckPocket</span>
          </Link>
          <div className="flex items-center gap-2">
            <StreakBadge streak={profile?.win_streak ?? 0} />
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-right">
              <p className="text-[10px] uppercase tracking-wide text-emerald-200/70">Pocket</p>
              <p className="font-display text-sm font-bold text-emerald-300">
                {formatINR(wallet?.pocket_balance ?? 0)}
              </p>
            </div>
          </div>
        </div>
        {jackpot && (
          <p className="mt-2 text-center text-[11px] text-amber-200/80">
            Jackpot pool · {formatINR(jackpot.pool_amount)}
            {api.isDemoMode ? ' · Demo mode' : ''}
          </p>
        )}
      </header>

      <main className="safe-bottom px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  )
}
