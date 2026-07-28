import { useEffect, useRef, useState } from 'react'
import { recordFocusSession } from '../lib/focusLog'
import { formatClock, phaseLabel } from '../lib/timerFormat'
import { pomodoroRemainingMs, useTimerStore } from '../store/timerStore'
import { useUiStore } from '../store/uiStore'

/**
 * Runs the Pomodoro globally: advances phases on completion (even while the
 * user is on another page), keeps the browser-tab title in sync with the
 * countdown, chimes, fires notifications, logs completed focus sessions and
 * announces meaningful changes to screen readers.
 */
export function PomodoroEngine() {
  const p = useTimerStore((s) => s.pomodoro)
  const pomoAdvance = useTimerStore((s) => s.pomoAdvance)
  const pushToast = useUiStore((s) => s.pushToast)

  // The aria-live region is updated imperatively (it's an external system for
  // assistive tech); keeping it out of React state avoids extra renders.
  const announcerRef = useRef<HTMLDivElement>(null)
  function announce(message: string) {
    if (announcerRef.current) announcerRef.current.textContent = message
  }

  // Refs to detect transitions without re-running effects every second.
  const prevRunning = useRef(p.running)
  const prevPhase = useRef(p.phase)
  const minuteAnnounced = useRef(false)

  // Tick once per second while running so remaining time (and the tab title)
  // stays fresh. Remaining is derived from timestamps, so accuracy doesn't
  // depend on the interval firing on time in background tabs.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!p.running) return
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    // Background tabs throttle intervals; re-sync instantly on return.
    const onVisible = () => setTick((t) => t + 1)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [p.running])

  const remaining = pomodoroRemainingMs(p)

  // Phase completion → chime + advance (runs anywhere in the app).
  useEffect(() => {
    if (!p.running || remaining > 0) return
    const finished = p.phase
    chime()
    const label =
      finished === 'focus' ? 'Focus session complete' : 'Break complete'
    pushToast('save', label)
    try {
      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        new Notification(label, {
          body: finished === 'focus' ? 'Time for a break.' : 'Ready to focus?',
          silent: false,
        })
      }
    } catch {
      // best effort
    }
    if (finished === 'focus') recordFocusSession(p.focusMin)
    announce(
      finished === 'focus'
        ? 'Focus session complete. Time for a break.'
        : 'Break complete. Ready for the next focus session.',
    )
    minuteAnnounced.current = false
    pomoAdvance()
  }, [p, remaining, pushToast, pomoAdvance])

  // Start / pause announcements.
  useEffect(() => {
    if (p.running !== prevRunning.current || p.phase !== prevPhase.current) {
      if (p.running && !prevRunning.current) {
        announce(`${phaseLabel(p.phase)} session started.`)
        minuteAnnounced.current = false
      } else if (!p.running && prevRunning.current && !p.justCompleted) {
        announce('Timer paused.')
      }
      prevRunning.current = p.running
      prevPhase.current = p.phase
    }
  }, [p.running, p.phase, p.justCompleted])

  // One-minute-remaining announcement.
  useEffect(() => {
    if (!p.running) return
    if (remaining <= 60_000 && remaining > 0 && !minuteAnnounced.current) {
      minuteAnnounced.current = true
      announce('One minute remaining.')
    }
  }, [p.running, remaining])

  // Browser tab title.
  useEffect(() => {
    let title = 'Hustler'
    if (p.running) {
      title = `${formatClock(remaining)} • ${phaseLabel(p.phase)} | Hustler`
    } else if (p.justCompleted) {
      title =
        p.justCompleted === 'focus'
          ? 'Focus Complete! | Hustler'
          : 'Break Complete! | Hustler'
    } else if (p.everStarted) {
      title = 'Paused • Hustler'
    }
    document.title = title
  }, [p.running, p.phase, p.justCompleted, p.everStarted, remaining])

  // Restore the default title if the app unmounts with a modified title.
  useEffect(() => {
    return () => {
      document.title = 'Hustler'
    }
  }, [])

  return (
    <div ref={announcerRef} aria-live="polite" role="status" className="sr-only" />
  )
}

/** Short audible chime via the WebAudio API (no asset needed). */
function chime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.45)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.65)
    osc.onended = () => ctx.close()
  } catch {
    // ignore
  }
}
