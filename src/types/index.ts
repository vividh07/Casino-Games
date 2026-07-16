export type GameId =
  | 'blackjack'
  | 'poker'
  | 'wheel'
  | 'slots'
  | 'crash'
  | 'plinko'
  | 'dragon_tiger'

export type GameOutcome = 'win' | 'loss' | 'push' | 'jackpot'

export interface Profile {
  user_id: string
  username: string
  win_streak: number
  best_streak: number
  total_wagered: number
  total_won: number
  last_daily_bonus_at: string | null
  created_at: string
}

export interface Wallet {
  user_id: string
  pocket_balance: number
  bank_balance: number
  last_interest_at: string
  updated_at: string
}

export interface Loan {
  id: string
  user_id: string
  principal: number
  original_principal: number
  interest_rate: number
  accrued_amount: number
  start_date: string
  last_interest_date: string
  last_deduction_date: string | null
  next_deduction_at: string
  status: 'active' | 'paid'
}

export interface Transaction {
  id: string
  user_id: string
  type: string
  amount: number
  meta: Record<string, unknown>
  created_at: string
}

export interface GameHistory {
  id: string
  user_id: string
  game_name: string
  bet_amount: number
  outcome: GameOutcome
  payout: number
  multiplier: number | null
  details: Record<string, unknown>
  created_at: string
}

export interface Quest {
  id: string
  user_id: string
  quest_type: string
  title: string
  progress: number
  target: number
  reward_amount: number
  quest_date: string
  completed: boolean
  claimed: boolean
}

export interface UserSettings {
  user_id: string
  daily_loss_limit: number | null
  sound_enabled: boolean
}

export interface Achievement {
  id: string
  user_id: string
  badge_key: string
  title: string
  earned_at: string
}

export interface JackpotPool {
  id: number
  pool_amount: number
  seed_amount: number
  last_winner_id: string | null
  last_won_at: string | null
}

export interface PlayResult {
  outcome: GameOutcome
  payout: number
  multiplier: number
  details: Record<string, unknown>
  jackpot: number
  streak: number
  streak_bonus: number
  pocket: number
  bank: number
}

export interface SessionUser {
  id: string
  email: string
}
