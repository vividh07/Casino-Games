export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-300">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
