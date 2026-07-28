import { useUiStore } from '../store/uiStore'
import { cn } from '../lib/utils'

const kindStyles: Record<string, string> = {
  save: 'border-lime-500/60 text-lime-200',
  delete: 'border-red-500/50 text-red-200',
  import: 'border-cyan-500/50 text-cyan-100',
  reset: 'border-amber-500/50 text-amber-100',
  info: 'border-zinc-500/50 text-zinc-200',
}

export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts)
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-none rounded border border-l bg-surface/95 px-3 py-2 text-sm shadow-none backdrop-blur-sm',
            kindStyles[t.kind] ?? kindStyles.info,
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
