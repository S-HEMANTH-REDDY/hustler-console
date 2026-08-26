import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addTask } from '../cloud/mutations'
import type { LifeTask } from '../db/types'
import { dayKey } from '../lib/dates'
import { cn, newId } from '../lib/utils'
import {
  TIMER_PRESETS,
  matchPreset,
  useTimerStore,
} from '../store/timerStore'
import { useUiStore } from '../store/uiStore'

/**
 * Three-step first-run flow: pick a preset, add a task, start focusing.
 * Skippable at any point; never shows again once completed or skipped.
 */
export function Onboarding() {
  const onboarded = useUiStore((s) => s.onboarded)
  const setOnboarded = useUiStore((s) => s.setOnboarded)
  const pushToast = useUiStore((s) => s.pushToast)
  const p = useTimerStore((s) => s.pomodoro)
  const pomoApplyPreset = useTimerStore((s) => s.pomoApplyPreset)
  const pomoStart = useTimerStore((s) => s.pomoStart)
  const pomoSetTask = useTimerStore((s) => s.pomoSetTask)
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [taskTitle, setTaskTitle] = useState('')

  if (onboarded) return null

  const activePreset = matchPreset(p)

  function finish(startSession: boolean) {
    setOnboarded(true)
    if (startSession) {
      pomoStart()
      navigate('/focus')
    }
  }

  async function saveTask() {
    const title = taskTitle.trim()
    if (!title) {
      setStep(2)
      return
    }
    const t: LifeTask = {
      id: newId(),
      title,
      priority: 'mid',
      recurrence: 'oneoff',
      lastCompletedAt: null,
      dueDate: dayKey(new Date()),
      dueTime: null,
      createdAt: Date.now(),
    }
    await addTask(t)
    pomoSetTask(t.id)
    pushToast('save', 'Task added')
    setStep(2)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Hustler"
      className="fixed inset-0 z-[130] flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="card w-full max-w-md rounded-xl p-5 sm:p-6 animate-slide-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === step ? 'w-6 bg-lime-400' : 'w-1.5 bg-surface-3',
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => finish(false)}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Skip
          </button>
        </div>

        {step === 0 ? (
          <>
            <h2 className="mt-4 text-lg font-semibold text-zinc-50">
              Welcome to Hustler
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Pick how you like to focus. You can change this anytime.
            </p>
            <div className="mt-4 grid gap-2">
              {TIMER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => pomoApplyPreset(preset.id)}
                  aria-pressed={activePreset === preset.id}
                  className={cn(
                    'flex items-center justify-between rounded-xl border px-3 py-3 text-left transition-colors',
                    activePreset === preset.id
                      ? 'border-lime-400/60 bg-lime-500/10'
                      : 'border-edge bg-well hover:border-edge-strong',
                  )}
                >
                  <span
                    className={cn(
                      'text-xs font-medium',
                      activePreset === preset.id
                        ? 'text-lime-300'
                        : 'text-zinc-200',
                    )}
                  >
                    {preset.label}
                  </span>
                  <span className="font-mono text-[0.6875rem] text-zinc-500">
                    {preset.focusMin} min focus · {preset.shortBreakMin} min
                    break
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-primary mt-4 w-full rounded-xl py-2.5 text-xs"
            >
              Continue
            </button>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h2 className="mt-4 text-lg font-semibold text-zinc-50">
              What's first on your list?
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Add one task to get started — assignments, prep, anything.
            </p>
            <input
              autoFocus
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveTask()
              }}
              placeholder="e.g. Finish problem set 3"
              className="field mt-4"
              aria-label="First task"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-quiet flex-1 py-2.5"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => void saveTask()}
                className="btn-primary flex-1 rounded-xl py-2.5 text-xs"
              >
                Add task
              </button>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className="mt-4 text-lg font-semibold text-zinc-50">
              Ready to focus?
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              {p.focusMin} minutes of focus, then a {p.shortBreakMin}-minute
              break. The timer runs on every page and in the tab title.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => finish(false)}
                className="btn-quiet flex-1 py-2.5"
              >
                Explore first
              </button>
              <button
                type="button"
                onClick={() => finish(true)}
                className="btn-primary flex-1 rounded-xl py-2.5 text-xs"
              >
                Start focusing
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
