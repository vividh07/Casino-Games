import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Loading } from '@/components/ui/Loading'
import { Login } from '@/pages/Login'
import { Signup } from '@/pages/Signup'
import { Home } from '@/pages/Home'
import { GamePage } from '@/pages/GamePage'
import { Bank } from '@/pages/Bank'
import { History } from '@/pages/History'
import { Leaderboard } from '@/pages/Leaderboard'
import { Quests } from '@/pages/Quests'
import { Profile } from '@/pages/Profile'
import { Settings } from '@/pages/Settings'
import { useAppStore } from '@/stores/appStore'

function Protected({ children }: { children: ReactNode }) {
  const ready = useAppStore((s) => s.ready)
  const user = useAppStore((s) => s.user)
  if (!ready) return <Loading label="Booting LuckPocket…" />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const init = useAppStore((s) => s.init)

  useEffect(() => {
    void init()
  }, [init])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          element={
            <Protected>
              <AppShell />
            </Protected>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route path="/bank" element={<Bank />} />
          <Route path="/history" element={<History />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
