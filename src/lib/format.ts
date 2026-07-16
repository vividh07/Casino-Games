export function formatINR(amount: number, compact = false): string {
  const n = Number.isFinite(amount) ? amount : 0
  if (compact && Math.abs(n) >= 1000) {
    return `₹${new Intl.NumberFormat('en-IN', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n)}`
  }
  return `₹${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.round(n))}`
}

export function formatMult(m: number): string {
  return `${m.toFixed(2)}x`
}

export function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function hoursUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60)))
}

export function uid(): string {
  return crypto.randomUUID()
}

export function streakBonus(streak: number): number {
  return Math.min(0.2, Math.max(0, streak) * 0.02)
}
