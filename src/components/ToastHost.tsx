import { useUiStore } from '../store/uiStore'
import { cn } from '../lib/utils'

const kindStyles: Record<string, { border: string; accent: string }> = {
  save: { border: 'border-lime-500/30', accent: 'bg-lime-500' },
  delete: { border: 'border-red-500/30', accent: 'bg-red-500' },
  import: { border: 'border-cyan-500/30', accent: 'bg-cyan-500' },
  reset: { border: 'border-amber-500/30', accent: 'bg-amber-500' },
  info: { border: 'border-zinc-500/20', accent: 'bg-zinc-500' },
}

export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts)
  return (
    <div
      className="pointer-events-none fixed bottom-5 right-5 z-[100] flex max-w-xs flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const style = kindStyles[t.kind] ?? kindStyles.info
        return (
          <div
            key={t.id}
            className={cn(
              'animate-slide-up pointer-events-none flex items-center gap-2.5 overflow-hidden rounded-2xl border bg-surface/95 px-4 py-3 text-sm text-zinc-200 shadow-xl backdrop-blur-xl',
              style.border,
            )}
          >
            <span className={cn('h-2 w-2 shrink-0 rounded-full', style.accent)} aria-hidden />
            {t.message}
          </div>
        )
      })}
    </div>
  )
}
