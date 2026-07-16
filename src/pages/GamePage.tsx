import { Navigate, useParams } from 'react-router-dom'
import { GAME_COMPONENTS } from '@/components/games'
import type { GameId } from '@/types'

export function GamePage() {
  const { gameId } = useParams()
  const Comp = GAME_COMPONENTS[gameId as GameId]
  if (!Comp) return <Navigate to="/" replace />
  return <Comp />
}
