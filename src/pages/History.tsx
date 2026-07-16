import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { gameLabel } from '@/lib/games'
import { formatINR } from '@/lib/format'
import { Loading } from '@/components/ui/Loading'
import type { GameHistory, Transaction } from '@/types'

export function History() {
  const [tab, setTab] = useState<'games' | 'transactions'>('games')
  const [gameFilter, setGameFilter] = useState('all')
  const [games, setGames] = useState<GameHistory[]>([])
  const [txs, setTxs] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const data = await api.getHistory()
        setGames(data.games)
        setTxs(data.transactions)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filteredGames = useMemo(
    () => (gameFilter === 'all' ? games : games.filter((g) => g.game_name === gameFilter)),
    [games, gameFilter],
  )

  if (loading) return <Loading label="Loading history…" />

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">History</h1>

      <div className="grid grid-cols-2 gap-2">
        {(['games', 'transactions'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-2xl py-2 text-sm font-semibold capitalize ${
              tab === t ? 'bg-violet-500' : 'bg-white/10'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'games' && (
        <>
          <select
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
          >
            <option value="all">All games</option>
            <option value="blackjack">Blackjack</option>
            <option value="poker">Teen Patti</option>
            <option value="wheel">Wheel</option>
            <option value="slots">Slots</option>
            <option value="crash">Crash</option>
            <option value="plinko">Plinko</option>
            <option value="dragon_tiger">Dragon Tiger</option>
          </select>
          <ul className="space-y-2">
            {filteredGames.map((g) => (
              <li key={g.id} className="glass rounded-2xl px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{gameLabel(g.game_name)}</span>
                  <span
                    className={
                      g.outcome === 'win' || g.outcome === 'jackpot'
                        ? 'text-emerald-300'
                        : g.outcome === 'push'
                          ? 'text-slate-300'
                          : 'text-rose-300'
                    }
                  >
                    {g.outcome} · {formatINR(g.payout)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Bet {formatINR(g.bet_amount)} · {new Date(g.created_at).toLocaleString()}
                </p>
              </li>
            ))}
            {!filteredGames.length && (
              <p className="text-sm text-slate-400">No rounds yet — hit the game grid.</p>
            )}
          </ul>
        </>
      )}

      {tab === 'transactions' && (
        <ul className="space-y-2">
          {txs.map((t) => (
            <li key={t.id} className="glass rounded-2xl px-4 py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold capitalize">{t.type.replaceAll('_', ' ')}</span>
                <span className="text-amber-300">{formatINR(t.amount)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(t.created_at).toLocaleString()}
              </p>
            </li>
          ))}
          {!txs.length && <p className="text-sm text-slate-400">No transactions yet.</p>}
        </ul>
      )}
    </div>
  )
}
