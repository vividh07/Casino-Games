import { create } from 'zustand'
import { api } from '@/lib/api'
import type {
  Achievement,
  JackpotPool,
  Loan,
  Profile,
  SessionUser,
  UserSettings,
  Wallet,
} from '@/types'

interface AppState {
  ready: boolean
  user: SessionUser | null
  profile: Profile | null
  wallet: Wallet | null
  loan: Loan | null
  settings: UserSettings | null
  jackpot: JackpotPool | null
  achievements: Achievement[]
  error: string | null
  loading: boolean
  init: () => Promise<void>
  refresh: () => Promise<void>
  setUser: (user: SessionUser | null) => void
  setBalances: (pocket: number, bank: number) => void
  setStreak: (streak: number) => void
  setError: (error: string | null) => void
  signOut: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  user: null,
  profile: null,
  wallet: null,
  loan: null,
  settings: null,
  jackpot: null,
  achievements: [],
  error: null,
  loading: false,

  setUser: (user) => set({ user }),
  setError: (error) => set({ error }),
  setBalances: (pocket, bank) => {
    const wallet = get().wallet
    if (!wallet) return
    set({
      wallet: {
        ...wallet,
        pocket_balance: pocket,
        bank_balance: bank,
        updated_at: new Date().toISOString(),
      },
    })
  },
  setStreak: (streak) => {
    const profile = get().profile
    if (!profile) return
    set({
      profile: {
        ...profile,
        win_streak: streak,
        best_streak: Math.max(profile.best_streak, streak),
      },
    })
  },

  init: async () => {
    try {
      const user = await api.getSession()
      set({ user })
      api.onAuthChange((u) => {
        set({ user: u })
        if (u) void get().refresh()
        else
          set({
            profile: null,
            wallet: null,
            loan: null,
            settings: null,
            achievements: [],
          })
      })
      if (user) await get().refresh()
    } finally {
      set({ ready: true })
    }
  },

  refresh: async () => {
    if (!get().user && !(await api.getSession())) return
    set({ loading: true, error: null })
    try {
      const snap = await api.getSnapshot()
      set({
        profile: snap.profile,
        wallet: snap.wallet,
        loan: snap.loan,
        settings: snap.settings,
        jackpot: snap.jackpot,
        achievements: snap.achievements,
      })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load' })
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    await api.signOut()
    set({
      user: null,
      profile: null,
      wallet: null,
      loan: null,
      settings: null,
      achievements: [],
      jackpot: null,
    })
  },
}))
