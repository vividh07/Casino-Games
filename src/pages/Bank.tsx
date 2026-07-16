import { useMemo, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { daysUntil, formatINR } from '@/lib/format'
import { useAppStore } from '@/stores/appStore'

export function Bank() {
  const wallet = useAppStore((s) => s.wallet)
  const loan = useAppStore((s) => s.loan)
  const refresh = useAppStore((s) => s.refresh)
  const [amount, setAmount] = useState(500)
  const [loanAmt, setLoanAmt] = useState(5000)
  const [repayAmt, setRepayAmt] = useState(500)
  const [from, setFrom] = useState<'pocket' | 'bank'>('pocket')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const nextInterest = useMemo(() => {
    if (!wallet) return null
    const next = new Date(wallet.last_interest_at)
    next.setDate(next.getDate() + 7)
    return next
  }, [wallet])

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      await fn()
      setMsg(ok)
      await refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Bank</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-3xl p-4">
          <p className="text-xs uppercase text-slate-400">Pocket</p>
          <p className="font-display text-2xl font-bold text-emerald-300">
            {formatINR(wallet?.pocket_balance ?? 0)}
          </p>
        </div>
        <div className="glass rounded-3xl p-4">
          <p className="text-xs uppercase text-slate-400">Bank</p>
          <p className="font-display text-2xl font-bold text-cyan-300">
            {formatINR(wallet?.bank_balance ?? 0)}
          </p>
        </div>
      </div>

      <section className="glass rounded-3xl p-4 space-y-3">
        <h2 className="font-display font-bold">Transfer</h2>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
          className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={busy}
            onClick={() => void run(() => api.transfer('deposit', amount), 'Deposited to Bank')}
          >
            Pocket → Bank
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void run(() => api.transfer('withdraw', amount), 'Withdrew to Pocket')}
          >
            Bank → Pocket
          </Button>
        </div>
      </section>

      <section className="glass rounded-3xl p-4 space-y-2">
        <h2 className="font-display font-bold">Savings interest</h2>
        <p className="text-sm text-slate-300">
          Bank earns <span className="text-amber-300 font-semibold">5% per week</span>, compounding.
        </p>
        {nextInterest && (
          <p className="text-xs text-slate-400">
            Next credit window: {nextInterest.toLocaleDateString()} (
            {daysUntil(nextInterest.toISOString())}d)
          </p>
        )}
      </section>

      <section className="glass rounded-3xl p-4 space-y-3">
        <h2 className="font-display font-bold">Loans</h2>
        {!loan ? (
          <>
            <p className="text-sm text-slate-300">
              Max ₹20,000 · 10%/day simple interest · debt ceiling 2× principal · proceeds to Bank.
            </p>
            <input
              type="number"
              min={1}
              max={20000}
              value={loanAmt}
              onChange={(e) => setLoanAmt(Number(e.target.value) || 0)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
            />
            <Button
              variant="gold"
              disabled={busy}
              onClick={() => void run(() => api.takeLoan(loanAmt), 'Loan deposited to Bank')}
            >
              Take loan
            </Button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-slate-400">Principal</p>
                <p className="font-bold">{formatINR(loan.principal)}</p>
              </div>
              <div>
                <p className="text-slate-400">Accrued interest</p>
                <p className="font-bold text-rose-300">{formatINR(loan.accrued_amount)}</p>
              </div>
              <div>
                <p className="text-slate-400">Total owed</p>
                <p className="font-bold text-amber-300">
                  {formatINR(loan.principal + loan.accrued_amount)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Next auto-deduct</p>
                <p className="font-bold">{daysUntil(loan.next_deduction_at)}d</p>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Ceiling {formatINR(loan.original_principal * 2)} · unpaid 7d → 50% Bank auto-deduct
            </p>
            <form
              className="space-y-2"
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                void run(() => api.repayLoan(repayAmt, from), 'Repayment applied')
              }}
            >
              <input
                type="number"
                min={1}
                value={repayAmt}
                onChange={(e) => setRepayAmt(Number(e.target.value) || 0)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFrom('pocket')}
                  className={`rounded-2xl py-2 text-sm font-semibold ${from === 'pocket' ? 'bg-violet-500' : 'bg-white/10'}`}
                >
                  From Pocket
                </button>
                <button
                  type="button"
                  onClick={() => setFrom('bank')}
                  className={`rounded-2xl py-2 text-sm font-semibold ${from === 'bank' ? 'bg-violet-500' : 'bg-white/10'}`}
                >
                  From Bank
                </button>
              </div>
              <Button className="w-full" disabled={busy}>
                Repay
              </Button>
            </form>
          </>
        )}
      </section>

      {msg && <p className="text-sm text-emerald-300">{msg}</p>}
      {err && <p className="text-sm text-rose-300">{err}</p>}
    </div>
  )
}
