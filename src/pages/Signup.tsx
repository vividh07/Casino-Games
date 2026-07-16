import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { useAppStore } from '@/stores/appStore'

export function Signup() {
  const navigate = useNavigate()
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const refresh = useAppStore((s) => s.refresh)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const u = await api.signUp(email, password, username)
      setUser(u)
      await refresh()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-4xl font-bold">
          Join <span className="neon-text">LuckPocket</span>
        </h1>
        <p className="mt-2 text-slate-300">Start with ₹1,500 virtual chips in your Pocket.</p>

        <form onSubmit={onSubmit} className="glass mt-8 space-y-4 rounded-3xl p-5">
          <label className="block text-sm text-slate-300">
            Username
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400"
            />
          </label>
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-violet-400"
            />
          </label>
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <Button className="w-full" disabled={loading}>
            {loading ? 'Creating…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already playing?{' '}
          <Link to="/login" className="font-semibold text-cyan-300">
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
