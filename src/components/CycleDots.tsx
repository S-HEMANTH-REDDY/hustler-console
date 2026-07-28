import { cn } from '../lib/utils'

/** `● ● ○ ○ — 2 of 4` focus-cycle progress indicator. */
export function CycleDots(props: { completed: number; total: number }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 align-middle"
      aria-label={`${props.completed} of ${props.total} focus sessions completed`}
    >
      {Array.from({ length: props.total }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            'inline-block h-2 w-2 rounded-full',
            i < props.completed
              ? 'bg-lime-400'
              : 'bg-surface-3 ring-1 ring-edge',
          )}
        />
      ))}
      <span className="ml-1 text-xs text-zinc-500">
        {props.completed} of {props.total}
      </span>
    </span>
  )
}
