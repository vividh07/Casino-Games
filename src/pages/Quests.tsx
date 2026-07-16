import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { useAppStore } from '@/stores/appStore'
import type { Quest } from '@/types'

export function Quests() {
  const refresh = useAppStore((s) => s.refresh)
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      setQuests(await api.ensureQuests())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function claim(id: string) {
    setMsg(null)
    try {
      const res = await api.claimQuest(id)
      setMsg(`Claimed ${formatINR(res.reward)}`)
      await refresh()
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed')
    }
  }

  if (loading) return <Loading label="Loading quests…" />

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Daily Quests</h1>
      <p className="text-sm text-slate-300">Rotates every 24h. Finish missions, claim Pocket rewards.</p>
      {msg && <p className="text-sm text-amber-200">{msg}</p>}
      <ul className="space-y-3">
        {quests.map((q) => {
          const pct = Math.min(100, Math.round((q.progress / q.target) * 100))
          return (
            <li key={q.id} className="glass rounded-3xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{q.title}</h3>
                  <p className="text-xs text-slate-400">
                    {q.progress}/{q.target} · Reward {formatINR(q.reward_amount)}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={!q.completed || q.claimed}
                  onClick={() => void claim(q.id)}
                >
                  {q.claimed ? 'Claimed' : q.completed ? 'Claim' : 'In progress'}
                </Button>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
