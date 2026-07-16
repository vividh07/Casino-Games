import confetti from 'canvas-confetti'
import { useState } from 'react'
import { api } from '@/lib/api'
import { sound } from '@/lib/sound'
import { useAppStore } from '@/stores/appStore'
import type { GameId, PlayResult } from '@/types'

export function usePlayGame(game: GameId) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PlayResult | null>(null)
  const [showWinCard, setShowWinCard] = useState(false)
  const soundOn = useAppStore((s) => s.settings?.sound_enabled ?? true)
  const setBalances = useAppStore((s) => s.setBalances)
  const setStreak = useAppStore((s) => s.setStreak)
  const refresh = useAppStore((s) => s.refresh)

  async function play(bet: number, action: Record<string, unknown> = {}) {
    setBusy(true)
    setError(null)
    setResult(null)
    setShowWinCard(false)
    try {
      sound.chip(soundOn)
      // Centralized server/demo resolution — clients never compute payouts
      const res = await api.playGame(game, bet, action)
      setResult(res)
      setBalances(res.pocket, res.bank)
      setStreak(res.streak)

      if (res.outcome === 'win' || res.outcome === 'jackpot') {
        sound.win(soundOn)
        if (res.payout >= bet * 3 || res.outcome === 'jackpot') {
          confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } })
          setShowWinCard(true)
        }
      } else if (res.outcome === 'loss') {
        sound.lose(soundOn)
      }

      void refresh()
      return res
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Play failed'
      setError(msg)
      throw e
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, result, showWinCard, setShowWinCard, play, setResult, setError }
}
