import { useSyncExternalStore } from 'react'
import {
  getFocusLog,
  subscribeFocusLog,
  type FocusSessionEntry,
} from '../lib/focusLog'

let cache: FocusSessionEntry[] = getFocusLog()

function subscribe(onChange: () => void) {
  return subscribeFocusLog(() => {
    cache = getFocusLog()
    onChange()
  })
}

/** Reactive view of the local focus-session log. */
export function useFocusLog(): FocusSessionEntry[] {
  return useSyncExternalStore(subscribe, () => cache)
}
