/** Lightweight WebAudio beeps — no asset files required. */

let ctx: AudioContext | null = null

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.08,
) {
  const audio = ac()
  if (!audio) return
  const osc = audio.createOscillator()
  const g = audio.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.value = gain
  osc.connect(g)
  g.connect(audio.destination)
  const now = audio.currentTime
  g.gain.exponentialRampToValueAtTime(0.001, now + duration)
  osc.start(now)
  osc.stop(now + duration)
}

export const sound = {
  chip(enabled: boolean) {
    if (!enabled) return
    tone(520, 0.08, 'triangle', 0.06)
  },
  win(enabled: boolean) {
    if (!enabled) return
    tone(660, 0.1, 'sine')
    setTimeout(() => tone(880, 0.12, 'sine'), 90)
    setTimeout(() => tone(1100, 0.16, 'sine'), 180)
  },
  lose(enabled: boolean) {
    if (!enabled) return
    tone(220, 0.2, 'sawtooth', 0.05)
  },
  click(enabled: boolean) {
    if (!enabled) return
    tone(400, 0.05, 'square', 0.03)
  },
}
