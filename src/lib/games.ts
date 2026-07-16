import type { GameId } from '@/types'

export const BET_PRESETS = [100, 200, 500, 1000, 5000] as const

export const GAMES: {
  id: GameId
  name: string
  blurb: string
  accent: string
  emoji: string
}[] = [
  {
    id: 'blackjack',
    name: 'Blackjack',
    blurb: 'Hit, stand, or double — beat the dealer.',
    accent: 'from-violet-500/30 to-fuchsia-500/10',
    emoji: '🂡',
  },
  {
    id: 'poker',
    name: 'Teen Patti',
    blurb: 'Three-card showdown. Highest hand wins.',
    accent: 'from-rose-500/30 to-orange-500/10',
    emoji: '🃏',
  },
  {
    id: 'wheel',
    name: 'Wheel Spin',
    blurb: 'Weighted multipliers. Chase the 10x.',
    accent: 'from-cyan-500/30 to-blue-500/10',
    emoji: '🎡',
  },
  {
    id: 'slots',
    name: 'Neon Slots',
    blurb: 'Three reels. Match symbols to cash out.',
    accent: 'from-amber-500/30 to-yellow-500/10',
    emoji: '🎰',
  },
  {
    id: 'crash',
    name: 'Crash',
    blurb: 'Cash out before the multiplier pops.',
    accent: 'from-emerald-500/30 to-teal-500/10',
    emoji: '🚀',
  },
  {
    id: 'plinko',
    name: 'Plinko',
    blurb: 'Drop the ball. Land a multiplier slot.',
    accent: 'from-pink-500/30 to-purple-500/10',
    emoji: '🔵',
  },
  {
    id: 'dragon_tiger',
    name: 'Dragon Tiger',
    blurb: 'Pick a side. Higher card takes it.',
    accent: 'from-red-500/30 to-amber-500/10',
    emoji: '🐉',
  },
]

export function gameLabel(id: string): string {
  return GAMES.find((g) => g.id === id)?.name ?? id
}

export const SLOT_SYMBOLS: Record<string, string> = {
  cherry: '🍒',
  lemon: '🍋',
  bell: '🔔',
  bar: '🟧',
  seven: '7️⃣',
  diamond: '💎',
}

export const CARD_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
