import { BET_PRESETS } from '@/lib/games'
import { formatINR } from '@/lib/format'
import { sound } from '@/lib/sound'
import { useAppStore } from '@/stores/appStore'

type Props = {
  bet: number
  onChange: (bet: number) => void
  disabled?: boolean
}

export function BetSelector({ bet, onChange, disabled }: Props) {
  const pocket = useAppStore((s) => s.wallet?.pocket_balance ?? 0)
  const soundOn = useAppStore((s) => s.settings?.sound_enabled ?? true)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {BET_PRESETS.map((amount) => {
          const tooMuch = amount > pocket
          const active = bet === amount
          return (
            <button
              key={amount}
              type="button"
              disabled={disabled || tooMuch}
              onClick={() => {
                sound.chip(soundOn)
                onChange(amount)
              }}
              className={`min-w-[4.5rem] rounded-full px-3 py-2 text-sm font-bold transition ${
                active
                  ? 'bg-gradient-to-r from-violet-500 to-cyan-400 text-ink'
                  : tooMuch
                    ? 'bg-white/5 text-slate-600'
                    : 'bg-white/10 text-white hover:bg-white/15'
              }`}
            >
              {formatINR(amount)}
            </button>
          )
        })}
      </div>
      <label className="block text-xs text-slate-400">
        Custom bet
        <input
          type="number"
          min={10}
          max={pocket}
          value={bet}
          disabled={disabled}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-violet-400"
        />
      </label>
    </div>
  )
}
