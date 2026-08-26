import { useUiStore } from '../store/uiStore'
import { cn } from '../lib/utils'

const kindStyles: Record<string, string> = {
  save: 'border-lime-500/40 text-lime-200',
  delete: 'border-red-500/40 text-red-200',
  import: 'border-cyan-500/40 text-cyan-200',
  reset: 'border-amber-500/40 text-amber-200',
  info: 'border-zinc-500/30 text-zinc-200',
}

export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts)
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-xs flex-col gap-1.5"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'animate-fade-in pointer-events-none rounded-lg border bg-surface/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm',
            kindStyles[t.kind] ?? kindStyles.info,
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
