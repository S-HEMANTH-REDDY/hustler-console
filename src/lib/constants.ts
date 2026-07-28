import type {
  ApplicationStatus,
  BehavioralCategory,
  DsaTopic,
  SystemDesignHLDTopic,
  SystemDesignKind,
  SystemDesignLLDTopic,
  SystemDesignTopic,
} from '../db/types'

export const APPLICATION_SOURCES = [
  'LinkedIn',
  'Company',
  'Referral',
  'Handshake',
  'Otta',
  'Wellfound',
  'Other',
] as const

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'Applied',
  'OA',
  'Phone',
  'Onsite',
  'Offer',
  'Accepted',
  'Rejected',
  'Ghosted',
]

export const FUNNEL_STATUSES: ApplicationStatus[] = [
  'Applied',
  'OA',
  'Phone',
  'Onsite',
  'Offer',
]

export const DSA_TOPICS: DsaTopic[] = [
  'Arrays',
  'Strings',
  'Two Pointers',
  'Sliding Window',
  'Binary Search',
  'Trees',
  'Graphs',
  'DP',
  'Greedy',
  'Backtracking',
  'Heaps',
  'Tries',
  'Stack/Queue',
  'Linked Lists',
  'Bit Manipulation',
  'Math',
  'Design',
]

export const SD_HLD_TOPICS: SystemDesignHLDTopic[] = [
  'Feeds',
  'Chat',
  'Search',
  'Rate Limiting',
  'Cache',
  'Storage',
  'Geo',
  'Streaming',
  'Notifications',
  'Recommender',
  'ML Serving',
  'Realtime',
  'Payments',
  'Auth',
  'Analytics',
  'Other',
]

export const SD_LLD_TOPICS: SystemDesignLLDTopic[] = [
  'Parking Lot',
  'Elevator',
  'ATM',
  'BookMyShow',
  'Splitwise',
  'Vending Machine',
  'Tic Tac Toe',
  'Chess',
  'Snake & Ladder',
  'LRU Cache',
  'Logger',
  'File System',
  'Library',
  'Hotel Booking',
  'Online Code Editor',
  'Ride Sharing',
  'Other',
]

/** All system-design topics across both kinds, in legacy order. */
export const SD_TOPICS: SystemDesignTopic[] = [
  ...SD_HLD_TOPICS,
  ...SD_LLD_TOPICS,
]

export function sdTopicsFor(kind: SystemDesignKind): SystemDesignTopic[] {
  return kind === 'lld' ? SD_LLD_TOPICS : SD_HLD_TOPICS
}

export const SD_KIND_LABEL: Record<SystemDesignKind, string> = {
  hld: 'HLD · High-level',
  lld: 'LLD · Low-level',
}

export const BEHAVIORAL_CATEGORIES: BehavioralCategory[] = [
  'Leadership',
  'Conflict',
  'Failure',
  'Teamwork',
  'Ownership',
  'Ambiguity',
  'Deadlines',
  'Learning',
  'Influence',
]

export function statusPillClass(status: ApplicationStatus): string {
  switch (status) {
    case 'Applied':
      return 'bg-edge text-zinc-300 border-zinc-600'
    case 'OA':
      return 'bg-cyan-950/50 text-cyan-300 border-cyan-700'
    case 'Phone':
      return 'bg-emerald-950/40 text-emerald-300 border-emerald-700'
    case 'Onsite':
      return 'bg-purple-950/50 text-purple-300 border-purple-700'
    case 'Offer':
    case 'Accepted':
      return 'bg-lime-950/40 text-lime-300 border-lime-500 font-semibold'
    case 'Rejected':
      return 'bg-red-950/40 text-red-300 border-red-600'
    case 'Ghosted':
      return 'border-dashed bg-transparent text-zinc-400 border-zinc-600'
    default:
      return 'bg-edge text-zinc-300'
  }
}
