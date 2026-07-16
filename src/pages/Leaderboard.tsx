import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { useAppStore } from '@/stores/appStore'

type Row = { user_id: string; username: string; payout: number }

export function Leaderboard() {
  const me = useAppStore((s) => s.user?.id)
  const [mode, setMode] = useState<'global' | 'friends'>('global')
  const [period, setPeriod] = useState<'today' | 'week'>('today')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [friendName, setFriendName] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      setLoading(true)
      try {
        const data = await api.getLeaderboard(mode, period)
        if (alive) setRows(data)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [mode, period])

  async function addFriend() {
    setMsg(null)
    try {
      await api.addFriendByUsername(friendName.trim())
      setMsg(`Added ${friendName}`)
      setFriendName('')
      if (mode === 'friends') {
        setRows(await api.getLeaderboard(mode, period))
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Leaderboard</h1>

      <div className="grid grid-cols-2 gap-2">
        {(['global', 'friends'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-2xl py-2 text-sm font-semibold capitalize ${
              mode === m ? 'bg-violet-500' : 'bg-white/10'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(['today', 'week'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-2xl py-2 text-sm font-semibold capitalize ${
              period === p ? 'bg-cyan-500/80 text-ink' : 'bg-white/10'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="glass rounded-3xl p-4 space-y-2">
        <p className="text-sm font-semibold">Add friend by username</p>
        <div className="flex gap-2">
          <input
            value={friendName}
            onChange={(e) => setFriendName(e.target.value)}
            className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 outline-none"
            placeholder="username"
          />
          <Button size="sm" onClick={() => void addFriend()}>
            Add
          </Button>
        </div>
        {msg && <p className="text-xs text-amber-200">{msg}</p>}
      </div>

      {loading ? (
        <Loading />
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li
              key={r.user_id}
              className={`glass flex items-center justify-between rounded-2xl px-4 py-3 ${
                r.user_id === me ? 'border-violet-400/40' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-display text-lg font-bold text-slate-400 w-6">{i + 1}</span>
                <span className="font-semibold">{r.username}</span>
              </div>
              <span className="font-bold text-amber-300">{formatINR(r.payout)}</span>
            </li>
          ))}
          {!rows.length && (
            <p className="text-sm text-slate-400">No winners in this window yet.</p>
          )}
        </ol>
      )}
    </div>
  )
}
