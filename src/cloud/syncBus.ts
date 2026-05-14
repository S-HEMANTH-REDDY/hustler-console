import { create } from 'zustand'

/** Increment to tell all cloud-backed hooks to refetch from Postgres. */
export const useCloudSyncBus = create<{
  tick: number
  bumpAll: () => void
}>((set) => ({
  tick: 0,
  bumpAll: () => set((s) => ({ tick: s.tick + 1 })),
}))

export function useCloudSyncTick(): number {
  return useCloudSyncBus((s) => s.tick)
}

export function bumpCloudSync(): void {
  useCloudSyncBus.getState().bumpAll()
}
