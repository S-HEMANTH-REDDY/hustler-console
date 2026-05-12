import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUiStore } from '../store/uiStore'

function isTypingTarget(t: EventTarget | null): boolean {
  if (!t || !(t instanceof HTMLElement)) return false
  const tag = t.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (t.isContentEditable) return true
  return false
}

export function useGlobalHotkeys() {
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen)
  const navigate = useNavigate()

  useEffect(() => {
    let pendingG = false
    let timer: number | null = null

    function clearPending() {
      pendingG = false
      if (timer != null) {
        window.clearTimeout(timer)
        timer = null
      }
    }

    function handler(e: KeyboardEvent) {
      // Cmd/Ctrl+K opens palette anywhere (including form fields)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
        return
      }
      if (e.key === 'Escape' && pendingG) {
        clearPending()
        return
      }

      if (isTypingTarget(e.target)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (!pendingG) {
        if (e.key === '?' || e.key === '/') {
          e.preventDefault()
          setPaletteOpen(true)
          return
        }
        if (e.key === 'g') {
          pendingG = true
          timer = window.setTimeout(clearPending, 1200)
          return
        }
        // Single-letter shortcuts for top actions
        const k = e.key.toLowerCase()
        if (k === 'a') {
          e.preventDefault()
          navigate('/applications#quick-log')
          return
        }
        return
      }

      // Pending g + letter
      const k = e.key.toLowerCase()
      clearPending()
      switch (k) {
        case 't':
          navigate('/')
          break
        case 'a':
          navigate('/applications')
          break
        case 'd':
          navigate('/dsa')
          break
        case 'y':
          navigate('/system-design')
          break
        case 'b':
          navigate('/behavioral')
          break
        case 'k':
          navigate('/tasks')
          break
        case 's':
          navigate('/settings')
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      clearPending()
    }
  }, [navigate, setPaletteOpen])
}
