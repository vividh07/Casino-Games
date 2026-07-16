/**
 * Central API facade — routes to Supabase RPCs when configured, else demo engine.
 * All wallet/game mutations go through here so games never touch balances directly.
 */
import { demoApi } from '@/lib/demo/engine'
import { isDemoMode, supabase } from '@/lib/supabase'
import type { GameId, PlayResult, Quest, SessionUser } from '@/types'

function assertSb() {
  if (!supabase) throw new Error('Supabase not configured')
  return supabase
}

function rpcError(error: { message: string } | null): never {
  throw new Error(error?.message ?? 'Request failed')
}

export const api = {
  isDemoMode,

  async getSession(): Promise<SessionUser | null> {
    if (isDemoMode) return demoApi.getSession()
    const sb = assertSb()
    const { data } = await sb.auth.getSession()
    const u = data.session?.user
    return u ? { id: u.id, email: u.email ?? '' } : null
  },

  onAuthChange(cb: (user: SessionUser | null) => void) {
    if (isDemoMode) return { data: { subscription: { unsubscribe() {} } } }
    const sb = assertSb()
    return sb.auth.onAuthStateChange((_e, session) => {
      const u = session?.user
      cb(u ? { id: u.id, email: u.email ?? '' } : null)
    })
  },

  async signUp(email: string, password: string, username: string) {
    if (isDemoMode) return demoApi.signUp(email, password, username)
    const sb = assertSb()
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })
    if (error) rpcError(error)
    return { id: data.user!.id, email }
  },

  async signIn(email: string, password: string) {
    if (isDemoMode) return demoApi.signIn(email, password)
    const sb = assertSb()
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    if (error) rpcError(error)
    return { id: data.user!.id, email }
  },

  async signOut() {
    if (isDemoMode) return demoApi.signOut()
    await assertSb().auth.signOut()
  },

  async getSnapshot() {
    if (isDemoMode) return demoApi.getSnapshot()
    const sb = assertSb()
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Parallel reads of user-owned rows (RLS enforced)
    const [profile, wallet, loan, settings, jackpot, achievements] = await Promise.all([
      sb.from('profiles').select('*').eq('user_id', user.id).single(),
      sb.from('wallets').select('*').eq('user_id', user.id).single(),
      sb.from('loans').select('*').eq('user_id', user.id).eq('status', 'active').maybeSingle(),
      sb.from('user_settings').select('*').eq('user_id', user.id).single(),
      sb.from('jackpot_pool').select('*').eq('id', 1).single(),
      sb.from('achievements').select('*').eq('user_id', user.id).order('earned_at', { ascending: false }),
    ])

    if (profile.error) rpcError(profile.error)
    if (wallet.error) rpcError(wallet.error)

    return {
      profile: profile.data!,
      wallet: wallet.data!,
      loan: loan.data ?? null,
      settings: settings.data!,
      jackpot: jackpot.data!,
      achievements: achievements.data ?? [],
    }
  },

  async transfer(direction: 'deposit' | 'withdraw', amount: number) {
    if (isDemoMode) return demoApi.transfer(direction, amount)
    const { data, error } = await assertSb().rpc('transfer_funds', {
      p_direction: direction,
      p_amount: amount,
    })
    if (error) rpcError(error)
    return data as { pocket: number; bank: number }
  },

  async takeLoan(amount: number) {
    if (isDemoMode) return demoApi.takeLoan(amount)
    const { data, error } = await assertSb().rpc('take_loan', { p_amount: amount })
    if (error) rpcError(error)
    return data
  },

  async repayLoan(amount: number, from: 'pocket' | 'bank' = 'pocket') {
    if (isDemoMode) return demoApi.repayLoan(amount, from)
    const { data, error } = await assertSb().rpc('repay_loan', {
      p_amount: amount,
      p_from: from,
    })
    if (error) rpcError(error)
    return data
  },

  async claimDailyBonus() {
    if (isDemoMode) return demoApi.claimDailyBonus()
    const { data, error } = await assertSb().rpc('claim_daily_bonus')
    if (error) rpcError(error)
    return data as { bonus: number }
  },

  async ensureQuests(): Promise<Quest[]> {
    if (isDemoMode) return demoApi.ensureQuests()
    const { data, error } = await assertSb().rpc('ensure_daily_quests')
    if (error) rpcError(error)
    return (data ?? []) as Quest[]
  },

  async claimQuest(questId: string) {
    if (isDemoMode) return demoApi.claimQuest(questId)
    const { data, error } = await assertSb().rpc('claim_quest_reward', { p_quest_id: questId })
    if (error) rpcError(error)
    return data as { reward: number }
  },

  async updateSettings(sound: boolean, dailyLossLimit: number | null) {
    if (isDemoMode) return demoApi.updateSettings(sound, dailyLossLimit)
    const { data, error } = await assertSb().rpc('update_settings', {
      p_sound: sound,
      p_daily_loss_limit: dailyLossLimit,
    })
    if (error) rpcError(error)
    return data
  },

  /** Server-side (or demo-mirrored) game resolution — never trust client for payout. */
  async playGame(
    game: GameId,
    bet: number,
    action: Record<string, unknown> = {},
  ): Promise<PlayResult> {
    if (isDemoMode) return demoApi.playGame(game, bet, action)
    const { data, error } = await assertSb().rpc('play_game', {
      p_game: game,
      p_bet: bet,
      p_action: action,
    })
    if (error) rpcError(error)
    return data as PlayResult
  },

  async getHistory() {
    if (isDemoMode) return demoApi.getHistory()
    const sb = assertSb()
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const [transactions, games] = await Promise.all([
      sb
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100),
      sb
        .from('game_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100),
    ])
    return {
      transactions: transactions.data ?? [],
      games: games.data ?? [],
    }
  },

  async getLeaderboard(mode: 'global' | 'friends', period: 'today' | 'week') {
    if (isDemoMode) return demoApi.getLeaderboard(mode, period)
    const sb = assertSb()
    const since =
      period === 'today'
        ? new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
        : new Date(Date.now() - 7 * 86400000).toISOString()

    let query = sb
      .from('game_history')
      .select('user_id, payout, outcome, profiles!inner(username)')
      .gte('created_at', since)
      .in('outcome', ['win', 'jackpot'])

    if (mode === 'friends') {
      const {
        data: { user },
      } = await sb.auth.getUser()
      const { data: friends } = await sb
        .from('friends')
        .select('friend_user_id')
        .eq('user_id', user!.id)
      const ids = [user!.id, ...(friends ?? []).map((f) => f.friend_user_id)]
      query = query.in('user_id', ids)
    }

    const { data, error } = await query.limit(500)
    if (error) rpcError(error)

    const totals = new Map<string, { username: string; payout: number }>()
    for (const row of data ?? []) {
      const username =
        (row as { profiles?: { username?: string } }).profiles?.username ?? 'Player'
      const prev = totals.get(row.user_id) ?? { username, payout: 0 }
      prev.payout += Number(row.payout)
      totals.set(row.user_id, prev)
    }
    return [...totals.entries()]
      .map(([user_id, v]) => ({ user_id, username: v.username, payout: v.payout }))
      .sort((a, b) => b.payout - a.payout)
      .slice(0, 20)
  },

  async addFriendByUsername(username: string) {
    if (isDemoMode) return demoApi.addFriendByUsername(username)
    const sb = assertSb()
    const { data: profile, error } = await sb
      .from('profiles')
      .select('user_id')
      .eq('username', username)
      .maybeSingle()
    if (error) rpcError(error)
    if (!profile) throw new Error('User not found')
    const {
      data: { user },
    } = await sb.auth.getUser()
    const { error: insErr } = await sb
      .from('friends')
      .insert({ user_id: user!.id, friend_user_id: profile.user_id })
    if (insErr) rpcError(insErr)
    return { ok: true }
  },

  async updateUsername(username: string) {
    if (isDemoMode) return demoApi.updateUsername(username)
    const sb = assertSb()
    const {
      data: { user },
    } = await sb.auth.getUser()
    const { data, error } = await sb
      .from('profiles')
      .update({ username })
      .eq('user_id', user!.id)
      .select()
      .single()
    if (error) rpcError(error)
    return data
  },
}
