/**
 * Local demo backend — mirrors Supabase RPC behavior when no project is configured.
 * All outcomes & balance updates are computed here (same rules as SQL RPCs).
 */
import { streakBonus, uid } from '@/lib/format'
import type {
  Achievement,
  GameHistory,
  GameId,
  JackpotPool,
  Loan,
  PlayResult,
  Profile,
  Quest,
  SessionUser,
  Transaction,
  UserSettings,
  Wallet,
} from '@/types'

const KEY = 'luckpocket_demo_v1'

interface DemoDB {
  users: Record<string, { email: string; password: string }>
  sessionUserId: string | null
  profiles: Record<string, Profile>
  wallets: Record<string, Wallet>
  loans: Loan[]
  transactions: Transaction[]
  game_history: GameHistory[]
  quests: Quest[]
  settings: Record<string, UserSettings>
  achievements: Achievement[]
  friends: { user_id: string; friend_user_id: string }[]
  jackpot: JackpotPool
  daily_loss: Record<string, number>
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function load(): DemoDB {
  const raw = localStorage.getItem(KEY)
  if (raw) return JSON.parse(raw) as DemoDB
  const db: DemoDB = {
    users: {},
    sessionUserId: null,
    profiles: {},
    wallets: {},
    loans: [],
    transactions: [],
    game_history: [],
    quests: [],
    settings: {},
    achievements: [],
    friends: [],
    jackpot: {
      id: 1,
      pool_amount: 10000,
      seed_amount: 10000,
      last_winner_id: null,
      last_won_at: null,
    },
    daily_loss: {},
  }
  save(db)
  return db
}

function save(db: DemoDB) {
  localStorage.setItem(KEY, JSON.stringify(db))
}

function bootstrapUser(db: DemoDB, id: string, _email: string, username: string) {
  const now = new Date().toISOString()
  db.profiles[id] = {
    user_id: id,
    username,
    win_streak: 0,
    best_streak: 0,
    total_wagered: 0,
    total_won: 0,
    last_daily_bonus_at: null,
    created_at: now,
  }
  db.wallets[id] = {
    user_id: id,
    pocket_balance: 1500,
    bank_balance: 0,
    last_interest_at: now,
    updated_at: now,
  }
  db.settings[id] = {
    user_id: id,
    daily_loss_limit: null,
    sound_enabled: true,
  }
}

function requireUser(db: DemoDB): string {
  if (!db.sessionUserId) throw new Error('Not authenticated')
  return db.sessionUserId
}

function tx(
  db: DemoDB,
  userId: string,
  type: string,
  amount: number,
  meta: Record<string, unknown> = {},
) {
  db.transactions.unshift({
    id: uid(),
    user_id: userId,
    type,
    amount,
    meta,
    created_at: new Date().toISOString(),
  })
}

function awardBadge(db: DemoDB, userId: string, key: string, title: string) {
  if (db.achievements.some((a) => a.user_id === userId && a.badge_key === key)) return
  db.achievements.unshift({
    id: uid(),
    user_id: userId,
    badge_key: key,
    title,
    earned_at: new Date().toISOString(),
  })
}

function bumpQuest(db: DemoDB, userId: string, type: string, inc = 1) {
  const q = db.quests.find(
    (x) => x.user_id === userId && x.quest_date === today() && x.quest_type === type && !x.completed,
  )
  if (!q) return
  q.progress = Math.min(q.target, q.progress + inc)
  q.completed = q.progress >= q.target
}

function applyEconomyJobs(db: DemoDB, userId: string) {
  // Loan daily interest + weekly auto-deduct
  const loan = db.loans.find((l) => l.user_id === userId && l.status === 'active')
  if (loan) {
    const ceiling = loan.original_principal * 2
    const owed = loan.principal + loan.accrued_amount
    if (loan.last_interest_date < today()) {
      if (owed < ceiling) {
        const daily = Math.round(loan.original_principal * 0.1)
        loan.accrued_amount = Math.min(ceiling - loan.principal, loan.accrued_amount + daily)
      }
      loan.last_interest_date = today()
    }
    if (new Date(loan.next_deduction_at).getTime() <= Date.now()) {
      const w = db.wallets[userId]
      const currentOwed = loan.principal + loan.accrued_amount
      const deduct = Math.min(Math.round(w.bank_balance * 0.5), currentOwed)
      if (deduct > 0) {
        w.bank_balance -= deduct
        if (deduct <= loan.accrued_amount) loan.accrued_amount -= deduct
        else {
          const rest = deduct - loan.accrued_amount
          loan.accrued_amount = 0
          loan.principal = Math.max(0, loan.principal - rest)
        }
        tx(db, userId, 'loan_auto_deduct', deduct, { loan_id: loan.id })
      }
      loan.last_deduction_date = new Date().toISOString()
      loan.next_deduction_at = new Date(Date.now() + 7 * 86400000).toISOString()
      if (loan.principal + loan.accrued_amount <= 0.009) {
        loan.principal = 0
        loan.accrued_amount = 0
        loan.status = 'paid'
        awardBadge(db, userId, 'paid_loan', 'Paid Off a Loan')
      }
    }
  }

  // Weekly bank interest 5%
  const w = db.wallets[userId]
  if (w.bank_balance > 0) {
    const elapsed = Date.now() - new Date(w.last_interest_at).getTime()
    if (elapsed >= 7 * 86400000) {
      const interest = Math.round(w.bank_balance * 0.05)
      if (interest > 0) {
        w.bank_balance += interest
        w.last_interest_at = new Date().toISOString()
        tx(db, userId, 'bank_interest', interest, { rate: 0.05 })
      }
    }
  }
}

function resolveGame(
  game: GameId,
  bet: number,
  action: Record<string, unknown>,
  streakMult: number,
): { outcome: PlayResult['outcome']; payout: number; mult: number; details: Record<string, unknown> } {
  if (game === 'blackjack') {
    let player = 12 + Math.floor(Math.random() * 10)
    let dealer = 12 + Math.floor(Math.random() * 10)
    const doubled = Boolean(action.double)
    if (Math.random() < 0.08 && dealer < 21) dealer = Math.min(21, dealer + 1)
    let outcome: PlayResult['outcome'] = 'loss'
    let payout = 0
    if (player > 21) {
      outcome = 'loss'
      payout = 0
    } else if (dealer > 21 || player > dealer) {
      outcome = 'win'
      payout = Math.round(bet * 2 * streakMult)
    } else if (player === dealer) {
      outcome = 'push'
      payout = bet
    }
    return {
      outcome,
      payout,
      mult: bet ? payout / bet : 0,
      details: { player, dealer, doubled },
    }
  }

  if (game === 'poker') {
    const player_score = Math.floor(Math.random() * 100)
    const house_score = Math.floor(Math.random() * 100)
    let outcome: PlayResult['outcome'] = 'loss'
    let payout = 0
    if (player_score > house_score) {
      outcome = 'win'
      payout = Math.round(bet * 2 * streakMult)
    } else if (player_score === house_score) {
      outcome = 'push'
      payout = bet
    }
    if (outcome === 'win' && Math.random() < 0.03) {
      outcome = 'loss'
      payout = 0
    }
    return {
      outcome,
      payout,
      mult: bet ? payout / bet : 0,
      details: { player_score, house_score },
    }
  }

  if (game === 'wheel') {
    const r = Math.random()
    let m = 0
    if (r < 0.3) m = 0
    else if (r < 0.55) m = 1.2
    else if (r < 0.75) m = 1.5
    else if (r < 0.88) m = 2
    else if (r < 0.95) m = 3
    else if (r < 0.985) m = 5
    else m = 10
    const payout = Math.round(bet * m * (m > 0 ? streakMult : 1))
    const outcome: PlayResult['outcome'] =
      payout > bet ? 'win' : payout === bet ? 'push' : 'loss'
    return { outcome, payout, mult: m, details: { multiplier: m } }
  }

  if (game === 'slots') {
    const symbols = ['cherry', 'lemon', 'bell', 'bar', 'seven', 'diamond']
    const weights = [30, 25, 18, 12, 10, 5]
    const pick = () => {
      let roll = Math.floor(Math.random() * 100)
      let acc = 0
      for (let i = 0; i < symbols.length; i++) {
        acc += weights[i]
        if (roll < acc) return symbols[i]
      }
      return symbols[0]
    }
    const reels = [pick(), pick(), pick()]
    let mult = 0
    let payout = 0
    let outcome: PlayResult['outcome'] = 'loss'
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      mult =
        reels[0] === 'diamond'
          ? 25
          : reels[0] === 'seven'
            ? 15
            : reels[0] === 'bar'
              ? 8
              : reels[0] === 'bell'
                ? 5
                : reels[0] === 'lemon'
                  ? 3
                  : 2
      payout = Math.round(bet * mult * streakMult)
      outcome = 'win'
    } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
      mult = 0.5
      payout = Math.round(bet * 0.5)
      outcome = 'loss'
    }
    return { outcome, payout, mult, details: { reels } }
  }

  if (game === 'crash') {
    let crash_at =
      Math.random() < 0.03
        ? 1
        : Math.min(100, Math.max(1.01, Math.round((0.97 / Math.max(0.01, Math.random())) * 100) / 100))
    let cashout = Number(action.cashout || 0)
    if (!cashout || cashout < 1.01) {
      cashout =
        Math.round(
          Math.min(crash_at + 0.5, Math.max(1.01, crash_at * (0.7 + Math.random() * 0.5))) * 100,
        ) / 100
    }
    if (cashout < crash_at) {
      const payout = Math.round(bet * cashout * streakMult)
      return {
        outcome: 'win',
        payout,
        mult: cashout,
        details: { crash_at, cashout },
      }
    }
    return { outcome: 'loss', payout: 0, mult: 0, details: { crash_at, cashout } }
  }

  if (game === 'plinko') {
    const slots = [5, 2, 1.1, 0.5, 0.3, 0.5, 1.1, 2, 5]
    const weights = [2, 5, 12, 18, 26, 18, 12, 5, 2]
    let roll = Math.floor(Math.random() * 100)
    let acc = 0
    let idx = 4
    for (let i = 0; i < 9; i++) {
      acc += weights[i]
      if (roll < acc) {
        idx = i
        break
      }
    }
    const m = slots[idx]
    const payout = Math.round(bet * m * (m >= 1 ? streakMult : 1))
    const outcome: PlayResult['outcome'] =
      payout > bet ? 'win' : payout === bet ? 'push' : 'loss'
    return { outcome, payout, mult: m, details: { slot: idx, multiplier: m } }
  }

  // dragon_tiger
  const side = String(action.side || 'dragon')
  const dragon = 1 + Math.floor(Math.random() * 13)
  const tiger = 1 + Math.floor(Math.random() * 13)
  const winner = dragon > tiger ? 'dragon' : tiger > dragon ? 'tiger' : 'tie'
  let outcome: PlayResult['outcome'] = 'loss'
  let payout = 0
  let mult = 0
  if (side === 'tie') {
    if (winner === 'tie') {
      mult = 8
      payout = Math.round(bet * 9 * streakMult)
      outcome = 'win'
    }
  } else if (side === winner) {
    mult = 2
    payout = Math.round(bet * 2 * streakMult)
    outcome = 'win'
  } else if (winner === 'tie') {
    outcome = 'push'
    payout = bet
    mult = 1
  }
  if (outcome === 'win' && side !== 'tie' && Math.random() < 0.01) {
    outcome = 'loss'
    payout = 0
    mult = 0
  }
  return {
    outcome,
    payout,
    mult,
    details: { dragon, tiger, winner, side },
  }
}

export const demoApi = {
  isDemo: true as const,

  getSession(): SessionUser | null {
    const db = load()
    if (!db.sessionUserId) return null
    const u = db.users[db.sessionUserId]
    if (!u) return null
    return { id: db.sessionUserId, email: u.email }
  },

  async signUp(email: string, password: string, username: string) {
    const db = load()
    if (Object.values(db.users).some((u) => u.email === email)) {
      throw new Error('Email already registered')
    }
    const id = uid()
    db.users[id] = { email, password }
    let uname = username || email.split('@')[0]
    if (Object.values(db.profiles).some((p) => p.username === uname)) {
      uname = `${uname}_${id.slice(0, 4)}`
    }
    bootstrapUser(db, id, email, uname)
    db.sessionUserId = id
    save(db)
    return { id, email }
  },

  async signIn(email: string, password: string) {
    const db = load()
    const entry = Object.entries(db.users).find(([, u]) => u.email === email)
    if (!entry || entry[1].password !== password) throw new Error('Invalid login credentials')
    db.sessionUserId = entry[0]
    save(db)
    return { id: entry[0], email }
  },

  async signOut() {
    const db = load()
    db.sessionUserId = null
    save(db)
  },

  async getSnapshot() {
    const db = load()
    const userId = requireUser(db)
    applyEconomyJobs(db, userId)
    save(db)
    return {
      profile: db.profiles[userId],
      wallet: db.wallets[userId],
      loan: db.loans.find((l) => l.user_id === userId && l.status === 'active') ?? null,
      settings: db.settings[userId],
      jackpot: db.jackpot,
      achievements: db.achievements.filter((a) => a.user_id === userId),
    }
  },

  async transfer(direction: 'deposit' | 'withdraw', amount: number) {
    const db = load()
    const userId = requireUser(db)
    const w = db.wallets[userId]
    if (amount <= 0) throw new Error('Invalid amount')
    if (direction === 'deposit') {
      if (w.pocket_balance < amount) throw new Error('Insufficient pocket balance')
      w.pocket_balance -= amount
      w.bank_balance += amount
    } else {
      if (w.bank_balance < amount) throw new Error('Insufficient bank balance')
      w.bank_balance -= amount
      w.pocket_balance += amount
    }
    w.updated_at = new Date().toISOString()
    tx(db, userId, direction, amount)
    save(db)
    return { pocket: w.pocket_balance, bank: w.bank_balance }
  },

  async takeLoan(amount: number) {
    const db = load()
    const userId = requireUser(db)
    if (amount <= 0 || amount > 20000) throw new Error('Loan must be between 1 and 20000')
    if (db.loans.some((l) => l.user_id === userId && l.status === 'active')) {
      throw new Error('You already have an active loan')
    }
    const loan: Loan = {
      id: uid(),
      user_id: userId,
      principal: amount,
      original_principal: amount,
      interest_rate: 0.1,
      accrued_amount: 0,
      start_date: new Date().toISOString(),
      last_interest_date: today(),
      last_deduction_date: null,
      next_deduction_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: 'active',
    }
    db.loans.unshift(loan)
    db.wallets[userId].bank_balance += amount
    tx(db, userId, 'loan_disbursed', amount, { loan_id: loan.id })
    save(db)
    return { loan_id: loan.id, principal: amount }
  },

  async repayLoan(amount: number, from: 'pocket' | 'bank' = 'pocket') {
    const db = load()
    const userId = requireUser(db)
    const loan = db.loans.find((l) => l.user_id === userId && l.status === 'active')
    if (!loan) throw new Error('No active loan')
    const owed = loan.principal + loan.accrued_amount
    const pay = Math.min(amount, owed)
    const w = db.wallets[userId]
    if (from === 'pocket') {
      if (w.pocket_balance < pay) throw new Error('Insufficient pocket balance')
      w.pocket_balance -= pay
    } else {
      if (w.bank_balance < pay) throw new Error('Insufficient bank balance')
      w.bank_balance -= pay
    }
    if (pay <= loan.accrued_amount) loan.accrued_amount -= pay
    else {
      const rest = pay - loan.accrued_amount
      loan.accrued_amount = 0
      loan.principal = Math.max(0, loan.principal - rest)
    }
    if (loan.principal + loan.accrued_amount <= 0.009) {
      loan.principal = 0
      loan.accrued_amount = 0
      loan.status = 'paid'
      awardBadge(db, userId, 'paid_loan', 'Paid Off a Loan')
    }
    tx(db, userId, 'loan_repaid', pay, { from, loan_id: loan.id })
    save(db)
    return {
      paid: pay,
      remaining: loan.principal + loan.accrued_amount,
      status: loan.status,
    }
  },

  async claimDailyBonus() {
    const db = load()
    const userId = requireUser(db)
    const p = db.profiles[userId]
    if (p.last_daily_bonus_at) {
      const last = new Date(p.last_daily_bonus_at).getTime()
      if (Date.now() - last < 86400000) throw new Error('Daily bonus already claimed')
    }
    const bonus = 100
    p.last_daily_bonus_at = new Date().toISOString()
    db.wallets[userId].pocket_balance += bonus
    tx(db, userId, 'daily_bonus', bonus)
    save(db)
    return { bonus }
  },

  async ensureQuests(): Promise<Quest[]> {
    const db = load()
    const userId = requireUser(db)
    const defs = [
      { type: 'play_any', title: 'Play 5 rounds of any game', target: 5, reward: 75 },
      { type: 'win_blackjack', title: 'Win 3 hands of Blackjack', target: 3, reward: 120 },
      { type: 'spin_wheel', title: 'Spin the wheel 5 times', target: 5, reward: 90 },
    ]
    for (const d of defs) {
      const exists = db.quests.some(
        (q) => q.user_id === userId && q.quest_type === d.type && q.quest_date === today(),
      )
      if (!exists) {
        db.quests.push({
          id: uid(),
          user_id: userId,
          quest_type: d.type,
          title: d.title,
          progress: 0,
          target: d.target,
          reward_amount: d.reward,
          quest_date: today(),
          completed: false,
          claimed: false,
        })
      }
    }
    save(db)
    return db.quests.filter((q) => q.user_id === userId && q.quest_date === today())
  },

  async claimQuest(questId: string) {
    const db = load()
    const userId = requireUser(db)
    const q = db.quests.find((x) => x.id === questId && x.user_id === userId)
    if (!q) throw new Error('Quest not found')
    if (!q.completed) throw new Error('Quest not completed')
    if (q.claimed) throw new Error('Reward already claimed')
    q.claimed = true
    db.wallets[userId].pocket_balance += q.reward_amount
    tx(db, userId, 'quest_reward', q.reward_amount, { quest_id: q.id })
    save(db)
    return { reward: q.reward_amount }
  },

  async updateSettings(sound: boolean, dailyLossLimit: number | null) {
    const db = load()
    const userId = requireUser(db)
    db.settings[userId] = {
      user_id: userId,
      sound_enabled: sound,
      daily_loss_limit: dailyLossLimit,
    }
    save(db)
    return { ok: true }
  },

  async playGame(
    game: GameId,
    bet: number,
    action: Record<string, unknown> = {},
  ): Promise<PlayResult> {
    const db = load()
    const userId = requireUser(db)
    applyEconomyJobs(db, userId)

    if (bet < 10) throw new Error('Minimum bet is 10')
    const settings = db.settings[userId]
    const lossKey = `${userId}:${today()}`
    const lost = db.daily_loss[lossKey] ?? 0
    if (settings.daily_loss_limit != null && lost + bet > settings.daily_loss_limit) {
      throw new Error('Daily loss limit reached')
    }

    const w = db.wallets[userId]
    const p = db.profiles[userId]
    let effectiveBet = bet
    if (game === 'blackjack' && action.double) {
      if (w.pocket_balance >= bet * 2) effectiveBet = bet * 2
      else action = { ...action, double: false }
    }
    if (w.pocket_balance < effectiveBet) throw new Error('Insufficient pocket balance')

    const streakMult = 1 + streakBonus(p.win_streak)
    w.pocket_balance -= effectiveBet
    tx(db, userId, 'game_bet', effectiveBet, { game })
    db.jackpot.pool_amount = Math.round((db.jackpot.pool_amount + effectiveBet * 0.01) * 100) / 100

    let result = resolveGame(game, effectiveBet, action, streakMult)

    // Jackpot chance
    let jackpot = 0
    if (Math.random() < Math.min(0.0025, 0.001 + effectiveBet / 1_000_000)) {
      jackpot = db.jackpot.pool_amount
      db.jackpot.pool_amount = db.jackpot.seed_amount
      db.jackpot.last_winner_id = userId
      db.jackpot.last_won_at = new Date().toISOString()
      w.pocket_balance += jackpot
      tx(db, userId, 'jackpot_win', jackpot)
      result = {
        ...result,
        outcome: 'jackpot',
        payout: result.payout + jackpot,
        details: { ...result.details, jackpot },
      }
    }

    if (result.payout > 0) {
      w.pocket_balance += result.payout
      tx(db, userId, 'game_payout', result.payout, { game, outcome: result.outcome })
    }

    p.total_wagered += effectiveBet
    if (result.outcome === 'win' || result.outcome === 'jackpot') {
      p.win_streak += 1
      p.best_streak = Math.max(p.best_streak, p.win_streak)
      p.total_won += result.payout
      if (game === 'blackjack') {
        bumpQuest(db, userId, 'win_blackjack')
        awardBadge(db, userId, 'first_bj_win', 'First Blackjack Win')
      }
    } else if (result.outcome === 'push') {
      p.total_won += result.payout
    } else {
      p.win_streak = 0
    }

    bumpQuest(db, userId, 'play_any')
    if (game === 'wheel') bumpQuest(db, userId, 'spin_wheel')

    const net = Math.max(0, effectiveBet - result.payout)
    db.daily_loss[lossKey] = (db.daily_loss[lossKey] ?? 0) + net

    db.game_history.unshift({
      id: uid(),
      user_id: userId,
      game_name: game,
      bet_amount: effectiveBet,
      outcome: result.outcome,
      payout: result.payout,
      multiplier: result.mult,
      details: result.details,
      created_at: new Date().toISOString(),
    })

    w.updated_at = new Date().toISOString()
    save(db)

    return {
      outcome: result.outcome,
      payout: result.payout,
      multiplier: result.mult,
      details: result.details,
      jackpot,
      streak: p.win_streak,
      streak_bonus: streakBonus(p.win_streak),
      pocket: w.pocket_balance,
      bank: w.bank_balance,
    }
  },

  async getHistory() {
    const db = load()
    const userId = requireUser(db)
    return {
      transactions: db.transactions.filter((t) => t.user_id === userId),
      games: db.game_history.filter((g) => g.user_id === userId),
    }
  },

  async getLeaderboard(mode: 'global' | 'friends', period: 'today' | 'week') {
    const db = load()
    const userId = requireUser(db)
    const since =
      period === 'today'
        ? new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
        : new Date(Date.now() - 7 * 86400000).toISOString()

    let friendIds: string[] | null = null
    if (mode === 'friends') {
      friendIds = db.friends.filter((f) => f.user_id === userId).map((f) => f.friend_user_id)
      friendIds.push(userId)
    }

    const totals = new Map<string, number>()
    for (const g of db.game_history) {
      if (g.created_at < since) continue
      if (friendIds && !friendIds.includes(g.user_id)) continue
      if (g.outcome !== 'win' && g.outcome !== 'jackpot') continue
      totals.set(g.user_id, (totals.get(g.user_id) ?? 0) + g.payout)
    }

    // Seed a few ghost rivals in demo for a lively board
    if (mode === 'global' && totals.size < 3) {
      ;[
        ['NeonKai', 4200],
        ['RupeeRebel', 3100],
        ['PixelQueen', 2750],
      ].forEach(([name, score], i) => {
        const ghostId = `ghost_${i}`
        if (!db.profiles[ghostId]) {
          db.profiles[ghostId] = {
            user_id: ghostId,
            username: name as string,
            win_streak: 0,
            best_streak: 0,
            total_wagered: 0,
            total_won: 0,
            last_daily_bonus_at: null,
            created_at: new Date().toISOString(),
          }
        }
        totals.set(ghostId, (totals.get(ghostId) ?? 0) + (score as number))
      })
      save(db)
    }

    return [...totals.entries()]
      .map(([id, payout]) => ({
        user_id: id,
        username: db.profiles[id]?.username ?? 'Player',
        payout,
      }))
      .sort((a, b) => b.payout - a.payout)
      .slice(0, 20)
  },

  async addFriendByUsername(username: string) {
    const db = load()
    const userId = requireUser(db)
    const friend = Object.values(db.profiles).find(
      (p) => p.username.toLowerCase() === username.toLowerCase(),
    )
    if (!friend) throw new Error('User not found')
    if (friend.user_id === userId) throw new Error('Cannot add yourself')
    if (!db.friends.some((f) => f.user_id === userId && f.friend_user_id === friend.user_id)) {
      db.friends.push({ user_id: userId, friend_user_id: friend.user_id })
      save(db)
    }
    return { ok: true }
  },

  async updateUsername(username: string) {
    const db = load()
    const userId = requireUser(db)
    if (!username.trim()) throw new Error('Username required')
    if (
      Object.values(db.profiles).some(
        (p) => p.username.toLowerCase() === username.toLowerCase() && p.user_id !== userId,
      )
    ) {
      throw new Error('Username taken')
    }
    db.profiles[userId].username = username.trim()
    save(db)
    return db.profiles[userId]
  },
}
