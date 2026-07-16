import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { useAppStore } from '@/stores/appStore'

export function Login() {
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const refresh = useAppStore((s) => s.refresh)
  const [email, setEmail] = useState('demo@luckpocket.app')
  const [password, setPassword] = useState('demo1234')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const u = await api.signIn(email, password)
      setUser(u)
      await refresh()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <p className="font-display text-sm uppercase tracking-[0.25em] text-violet-300/80">
          Virtual chips only
        </p>
        <h1 className="mt-2 font-display text-5xl font-bold leading-none">
          <span className="neon-text">LuckPocket</span>
        </h1>
        <p className="mt-3 max-w-sm text-slate-300">
          Mini-games. One balance. Purely fictional rupees — no real money, ever.
        </p>

        <form onSubmit={onSubmit} className="glass mt-8 space-y-4 rounded-3xl p-5">
          <label className="block text-sm text-slate-300">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400"
            />
          </label>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <Button className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Enter LuckPocket'}
          </Button>
          {api.isDemoMode && (
            <p className="text-center text-xs text-slate-400">
              Demo mode — create an account or use any new email to start with ₹1,500.
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          New here?{' '}
          <Link to="/signup" className="font-semibold text-cyan-300">
            Create account
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
