import { useMemo, useState, type FormEvent } from 'react'
import {
  addBehavioralStory,
  deleteBehavioralById,
  patchBehavioralFields,
} from '../cloud/mutations'
import { useBehavioralStoriesHybrid } from '../cloud/hybridData'
import type {
  BehavioralCategory,
  BehavioralStatus,
  BehavioralStory,
} from '../db/types'
import { BEHAVIORAL_CATEGORIES } from '../lib/constants'
import { cn, newId } from '../lib/utils'
import { useUiStore } from '../store/uiStore'
import { BehavioralQuestionBank } from '../components/BehavioralQuestionBank'

export function BehavioralPage() {
  const stories = useBehavioralStoriesHybrid()
  const pushToast = useUiStore((s) => s.pushToast)
  const [openId, setOpenId] = useState<string | null>(null)

  const coverage = useMemo(() => {
    return BEHAVIORAL_CATEGORIES.map((cat) => {
      const inCat = stories.filter((s) => s.category === cat)
      const count = inCat.length
      const avg =
        count === 0
          ? 0
          : Math.round(
              (inCat.reduce((s, x) => s + x.confidence, 0) / count) * 10,
            ) / 10
      return { cat, count, avg }
    })
  }, [stories])

  async function addStory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const title = String(fd.get('title') ?? '').trim()
    if (!title) {
      pushToast('info', 'Title required')
      return
    }
    const s: BehavioralStory = {
      id: newId(),
      title,
      category: (fd.get('category') as BehavioralCategory) || 'Leadership',
      status: (fd.get('status') as BehavioralStatus) || 'draft',
      confidence: Number(fd.get('confidence')) as 1 | 2 | 3 | 4 | 5,
      situation: '',
      task: '',
      action: '',
      result: '',
      updatedAt: Date.now(),
    }
    await addBehavioralStory(s)
    pushToast('save', 'Story added')
    e.currentTarget.reset()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      <BehavioralQuestionBank />

      <section className="card p-5">
        <h2 className="text-base font-semibold text-zinc-100 mb-3">
          Coverage
        </h2>
        <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-3">
          {coverage.map((c) => (
            <div
              key={c.cat}
              className={cn(
                'rounded-xl border p-3',
                c.count === 0
                  ? 'border-amber-600/60 bg-amber-950/20'
                  : 'border-edge bg-pit',
              )}
            >
              <div className="text-sm font-medium text-zinc-200">{c.cat}</div>
              <div className="mt-1 font-mono text-xs text-zinc-400">
                Stories: <span className="text-zinc-100">{c.count}</span> · Avg
                conf:{' '}
                <span className="text-zinc-100">{c.count ? c.avg : '—'}</span>
              </div>
              {c.count === 0 ? (
                <div className="mt-2 text-xs text-amber-300">Gap · no stories</div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-base font-semibold text-zinc-100 mb-3">New story</h2>
        <form
          className="grid gap-3 md:grid-cols-4"
          onSubmit={addStory}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              e.currentTarget.requestSubmit()
            }
          }}
        >
          <label className="col-span-2 block space-y-1">
            <span className="text-xs text-zinc-400">Title</span>
            <input name="title" className="field" required />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Category</span>
            <select name="category" className="field">
              {BEHAVIORAL_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Status</span>
            <select name="status" className="field" defaultValue="draft">
              <option value="draft">draft</option>
              <option value="refined">refined</option>
              <option value="memorized">memorized</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Confidence</span>
            <select name="confidence" className="field" defaultValue="3">
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="col-span-full flex justify-end">
            <button
              type="submit"
              className="btn-primary rounded-xl px-5 py-2.5 text-sm"
            >
              Add story
            </button>
          </div>
        </form>
      </section>

      <div className="space-y-2.5">
        {stories
          .slice()
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map((s) => {
            const open = openId === s.id
            return (
              <div
                key={s.id}
                className="card p-5 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    className="w-8 shrink-0 text-left text-zinc-400 hover:text-lime-300"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : s.id)}
                  >
                    {open ? '▼' : '▶'}
                  </button>
                  <input
                    className="field min-w-0 flex-[2] basis-full text-sm sm:basis-[10rem]"
                    defaultValue={s.title}
                    onBlur={(e) => {
                      void patchBehavioralFields(s.id, {
                        title: e.target.value,
                        updatedAt: Date.now(),
                      })
                      pushToast('save', 'Saved')
                    }}
                  />
                  <select
                    className="field w-40 text-xs"
                    value={s.category}
                    onChange={(e) => {
                      void patchBehavioralFields(s.id, {
                        category: e.target.value as BehavioralCategory,
                        updatedAt: Date.now(),
                      })
                      pushToast('save', 'Saved')
                    }}
                  >
                    {BEHAVIORAL_CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    className="field w-32 text-xs"
                    value={s.status}
                    onChange={(e) => {
                      void patchBehavioralFields(s.id, {
                        status: e.target.value as BehavioralStatus,
                        updatedAt: Date.now(),
                      })
                      pushToast('save', 'Saved')
                    }}
                  >
                    <option value="draft">draft</option>
                    <option value="refined">refined</option>
                    <option value="memorized">memorized</option>
                  </select>
                  <select
                    className="field w-24 text-xs"
                    value={s.confidence}
                    onChange={(e) => {
                      void patchBehavioralFields(s.id, {
                        confidence: Number(e.target.value) as 1 | 2 | 3 | 4 | 5,
                        updatedAt: Date.now(),
                      })
                      pushToast('save', 'Saved')
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="rounded-xl border border-red-900/50 px-2 py-1 text-xs text-red-300"
                    onClick={() => {
                      if (!window.confirm('Delete story?')) return
                      void deleteBehavioralById(s.id)
                      pushToast('delete', 'Deleted')
                    }}
                  >
                    Delete
                  </button>
                </div>
                {open ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <StarArea
                      label="Situation"
                      value={s.situation}
                      onCommit={(v) =>
                        patchBehavioralFields(s.id, {
                          situation: v,
                          updatedAt: Date.now(),
                        })
                      }
                      onToast={() => pushToast('save', 'Saved')}
                    />
                    <StarArea
                      label="Task"
                      value={s.task}
                      onCommit={(v) =>
                        patchBehavioralFields(s.id, {
                          task: v,
                          updatedAt: Date.now(),
                        })
                      }
                      onToast={() => pushToast('save', 'Saved')}
                    />
                    <StarArea
                      label="Action"
                      value={s.action}
                      onCommit={(v) =>
                        patchBehavioralFields(s.id, {
                          action: v,
                          updatedAt: Date.now(),
                        })
                      }
                      onToast={() => pushToast('save', 'Saved')}
                    />
                    <StarArea
                      label="Result"
                      value={s.result}
                      onCommit={(v) =>
                        patchBehavioralFields(s.id, {
                          result: v,
                          updatedAt: Date.now(),
                        })
                      }
                      onToast={() => pushToast('save', 'Saved')}
                    />
                  </div>
                ) : null}
                <p className="mt-2 text-xs text-zinc-400">
                  STAR blocks autosave on blur · ⌘/Ctrl+Enter commits textarea
                </p>
              </div>
            )
          })}
        {stories.length === 0 ? (
          <div className="text-center text-sm text-zinc-400">No stories yet</div>
        ) : null}
      </div>
    </div>
  )
}

function StarArea(props: {
  label: string
  value: string
  onCommit: (v: string) => unknown
  onToast: () => void
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs uppercase text-zinc-400">{props.label}</span>
      <textarea
        className="field min-h-[96px] resize-y font-mono text-xs"
        defaultValue={props.value}
        onBlur={(e) => {
          void props.onCommit(e.target.value)
          props.onToast()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            e.currentTarget.blur()
          }
        }}
      />
    </label>
  )
}
