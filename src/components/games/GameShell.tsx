import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { formatINR } from '@/lib/format'
import { useAppStore } from '@/stores/appStore'
import { StreakBadge } from '@/components/ui/StreakBadge'

export function GameShell({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const pocket = useAppStore((s) => s.wallet?.pocket_balance ?? 0)
  const streak = useAppStore((s) => s.profile?.win_streak ?? 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Link to="/" className="text-xs text-slate-400 hover:text-white">
            ← Games
          </Link>
          <h1 className="font-display text-2xl font-bold">{title}</h1>
        </div>
        <div className="text-right">
          <StreakBadge streak={streak} />
          <p className="mt-1 text-sm font-bold text-emerald-300">{formatINR(pocket)}</p>
        </div>
      </div>
      {children}
    </div>
  )
}
