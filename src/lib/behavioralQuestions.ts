import type { BehavioralCategory } from '../db/types'

/** Who the question is best suited for when preparing STAR stories. */
export type BehavioralExperienceLevel = 'no-experience' | 'experienced' | 'both'

export interface BehavioralQuestion {
  id: string
  text: string
  category: BehavioralCategory
  experience: BehavioralExperienceLevel
  /** Which bundled study guide this came from. */
  source: 'amazon-study' | 'star-method' | 'leadership-principles'
}

export const BEHAVIORAL_EXPERIENCE_LABELS: Record<
  BehavioralExperienceLevel | 'all',
  string
> = {
  all: 'All levels',
  'no-experience': 'No / limited experience',
  experienced: 'Has work experience',
  both: 'Everyone',
}

/** Bundled PDFs from your AZ folder — available to every user without uploading. */
export const BUILTIN_BEHAVIORAL_GUIDES = [
  {
    id: 'amazon-study',
    title: 'Behavioral Questions Study Guide',
    description: 'Amazon-style behavioral questions, STAR format, and prep worksheets.',
    fileName: 'Behavioral Questions Study Guide.pdf',
  },
  {
    id: 'star-method',
    title: 'STAR Method for Interviews',
    description: 'STAR structure, sample answers, and classic behavioral prompts.',
    fileName: 'STAR_Method_Interviews.pdf',
  },
  {
    id: 'amazon-lp',
    title: 'Amazon Leadership Principles',
    description: 'Full LP reference — map each story to 4–6 principles per answer.',
    fileName: 'amazon-leadership-principles.pdf',
  },
] as const

export function behavioralGuideUrl(fileName: string): string {
  const base = import.meta.env.BASE_URL ?? '/'
  return `${base}behavioral-guides/${encodeURIComponent(fileName)}`
}

/** Curated from Desktop/AZ PDFs — filtered by experience in the UI. */
export const BEHAVIORAL_QUESTIONS: BehavioralQuestion[] = [
  // Amazon Behavioral Questions Study Guide
  {
    id: 'amz-1',
    text: 'Tell me about a time when you were faced with a problem that had a number of possible solutions. What was the problem and how did you determine the course of action? What was the outcome?',
    category: 'Ambiguity',
    experience: 'both',
    source: 'amazon-study',
  },
  {
    id: 'amz-2',
    text: 'When did you take a risk, make a mistake, or fail? How did you respond, and how did you grow from that experience?',
    category: 'Failure',
    experience: 'both',
    source: 'amazon-study',
  },
  {
    id: 'amz-3',
    text: 'Describe a time you took the lead on a project.',
    category: 'Leadership',
    experience: 'both',
    source: 'amazon-study',
  },
  {
    id: 'amz-4',
    text: 'What did you do when you needed to motivate a group of individuals or promote collaboration on a particular project?',
    category: 'Teamwork',
    experience: 'experienced',
    source: 'amazon-study',
  },
  {
    id: 'amz-5',
    text: 'How have you leveraged data to develop a strategy?',
    category: 'Influence',
    experience: 'experienced',
    source: 'amazon-study',
  },
  // STAR Method — stronger for students / early career
  {
    id: 'star-1',
    text: 'Describe a situation in which you were able to use persuasion to successfully convince someone to see things your way.',
    category: 'Influence',
    experience: 'both',
    source: 'star-method',
  },
  {
    id: 'star-2',
    text: 'Describe a time when you were faced with a stressful situation that demonstrated your coping skills.',
    category: 'Ambiguity',
    experience: 'both',
    source: 'star-method',
  },
  {
    id: 'star-3',
    text: 'Give me a specific example of a time when you used good judgment and logic in solving a problem.',
    category: 'Ambiguity',
    experience: 'both',
    source: 'star-method',
  },
  {
    id: 'star-4',
    text: 'Give me an example of a time when you set a goal and were able to meet or achieve it.',
    category: 'Ownership',
    experience: 'no-experience',
    source: 'star-method',
  },
  {
    id: 'star-5',
    text: 'Tell me about a time when you had to use your presentation skills to influence someone\'s opinion.',
    category: 'Influence',
    experience: 'no-experience',
    source: 'star-method',
  },
  {
    id: 'star-6',
    text: 'Give me a specific example of a time when you had to conform to a policy with which you did not agree.',
    category: 'Conflict',
    experience: 'both',
    source: 'star-method',
  },
  {
    id: 'star-7',
    text: 'Please discuss an important written document you were required to complete.',
    category: 'Ownership',
    experience: 'no-experience',
    source: 'star-method',
  },
  {
    id: 'star-8',
    text: 'Tell me about a time when you had to go above and beyond the call of duty in order to get a job done.',
    category: 'Ownership',
    experience: 'both',
    source: 'star-method',
  },
  {
    id: 'star-9',
    text: 'Tell me about a time when you had too many things to do and you were required to prioritize your tasks.',
    category: 'Deadlines',
    experience: 'both',
    source: 'star-method',
  },
  {
    id: 'star-10',
    text: 'Give me an example of a time when you had to make a split second decision.',
    category: 'Ambiguity',
    experience: 'both',
    source: 'star-method',
  },
  {
    id: 'star-11',
    text: 'What is your typical way of dealing with conflict? Give me an example.',
    category: 'Conflict',
    experience: 'both',
    source: 'star-method',
  },
  {
    id: 'star-12',
    text: 'Tell me about a time you were able to successfully deal with another person even when that individual may not have personally liked you.',
    category: 'Conflict',
    experience: 'both',
    source: 'star-method',
  },
  {
    id: 'star-13',
    text: 'Tell me about a difficult decision you\'ve made in the last year.',
    category: 'Ambiguity',
    experience: 'experienced',
    source: 'star-method',
  },
  {
    id: 'star-14',
    text: 'Give me an example of a time when something you tried to accomplish and failed.',
    category: 'Failure',
    experience: 'both',
    source: 'star-method',
  },
  {
    id: 'star-15',
    text: 'Give me an example of when you showed initiative and took the lead.',
    category: 'Leadership',
    experience: 'no-experience',
    source: 'star-method',
  },
  {
    id: 'star-16',
    text: 'Tell me about a recent situation in which you had to deal with a very upset customer or co-worker.',
    category: 'Conflict',
    experience: 'experienced',
    source: 'star-method',
  },
  {
    id: 'star-17',
    text: 'Give me an example of a time when you motivated others.',
    category: 'Leadership',
    experience: 'experienced',
    source: 'star-method',
  },
  {
    id: 'star-18',
    text: 'Tell me about a time when you delegated a project effectively.',
    category: 'Leadership',
    experience: 'experienced',
    source: 'star-method',
  },
  {
    id: 'star-19',
    text: 'Give me an example of a time when you used your fact-finding skills to solve a problem.',
    category: 'Learning',
    experience: 'both',
    source: 'star-method',
  },
  {
    id: 'star-20',
    text: 'Tell me about a time when you missed an obvious solution to a problem.',
    category: 'Learning',
    experience: 'both',
    source: 'star-method',
  },
  {
    id: 'star-21',
    text: 'Describe a time when you anticipated potential problems and developed preventive measures.',
    category: 'Ownership',
    experience: 'experienced',
    source: 'star-method',
  },
  {
    id: 'star-22',
    text: 'Tell me about a time when you were forced to make an unpopular decision.',
    category: 'Leadership',
    experience: 'experienced',
    source: 'star-method',
  },
  {
    id: 'star-23',
    text: 'Describe a time when you set your sights too high (or too low).',
    category: 'Learning',
    experience: 'both',
    source: 'star-method',
  },
  // Leadership-principles themed prompts (experienced / Amazon-style)
  {
    id: 'lp-1',
    text: 'Tell me about a time you obsessed over customer needs and changed course based on what you learned.',
    category: 'Influence',
    experience: 'experienced',
    source: 'leadership-principles',
  },
  {
    id: 'lp-2',
    text: 'Describe a situation where you took ownership beyond your formal role when something was broken.',
    category: 'Ownership',
    experience: 'both',
    source: 'leadership-principles',
  },
  {
    id: 'lp-3',
    text: 'Give an example of when you simplified a process or system that was overly complex.',
    category: 'Influence',
    experience: 'experienced',
    source: 'leadership-principles',
  },
  {
    id: 'lp-4',
    text: 'Tell me about a time you made a decision with incomplete data. How did you validate you were right?',
    category: 'Ambiguity',
    experience: 'experienced',
    source: 'leadership-principles',
  },
  {
    id: 'lp-5',
    text: 'Describe how you learned something new quickly and applied it to deliver results.',
    category: 'Learning',
    experience: 'no-experience',
    source: 'leadership-principles',
  },
  {
    id: 'lp-6',
    text: 'Tell me about a time you raised the bar on quality or standards for yourself or your team.',
    category: 'Ownership',
    experience: 'experienced',
    source: 'leadership-principles',
  },
  {
    id: 'lp-7',
    text: 'Describe a bold idea you pursued that seemed risky but paid off (or taught you something).',
    category: 'Leadership',
    experience: 'both',
    source: 'leadership-principles',
  },
  {
    id: 'lp-8',
    text: 'Tell me about a time you had to disagree with a manager or team and commit once a decision was made.',
    category: 'Conflict',
    experience: 'experienced',
    source: 'leadership-principles',
  },
  {
    id: 'lp-9',
    text: 'Give an example of diving deep into details when surface-level metrics looked fine.',
    category: 'Learning',
    experience: 'experienced',
    source: 'leadership-principles',
  },
  {
    id: 'lp-10',
    text: 'Tell me about a time you delivered results despite significant setbacks or ambiguity.',
    category: 'Deadlines',
    experience: 'both',
    source: 'leadership-principles',
  },
  // Student / early-career framing (no full-time work history)
  {
    id: 'early-1',
    text: 'Tell me about a group project (class, club, or volunteer) where you stepped up when the team was stuck.',
    category: 'Teamwork',
    experience: 'no-experience',
    source: 'star-method',
  },
  {
    id: 'early-2',
    text: 'Describe a time you balanced school, work, or personal commitments when everything was due at once.',
    category: 'Deadlines',
    experience: 'no-experience',
    source: 'star-method',
  },
  {
    id: 'early-3',
    text: 'Give an example from an internship, part-time job, or campus role where you learned something new fast.',
    category: 'Learning',
    experience: 'no-experience',
    source: 'star-method',
  },
  {
    id: 'early-4',
    text: 'Tell me about a time you received tough feedback on a project or assignment. What did you change?',
    category: 'Learning',
    experience: 'no-experience',
    source: 'star-method',
  },
  {
    id: 'early-5',
    text: 'Describe a time you had to explain a technical or complex topic to someone non-technical.',
    category: 'Influence',
    experience: 'no-experience',
    source: 'star-method',
  },
]

export function filterBehavioralQuestions(
  questions: BehavioralQuestion[],
  opts: {
    experience?: BehavioralExperienceLevel | 'all'
    category?: BehavioralCategory | 'all'
    query?: string
  },
): BehavioralQuestion[] {
  const q = (opts.query ?? '').trim().toLowerCase()
  return questions.filter((item) => {
    if (opts.experience && opts.experience !== 'all') {
      if (
        item.experience !== opts.experience &&
        item.experience !== 'both'
      ) {
        return false
      }
    }
    if (opts.category && opts.category !== 'all' && item.category !== opts.category) {
      return false
    }
    if (q && !item.text.toLowerCase().includes(q)) return false
    return true
  })
}

export function pickRandomQuestion(
  questions: BehavioralQuestion[],
): BehavioralQuestion | null {
  if (questions.length === 0) return null
  return questions[Math.floor(Math.random() * questions.length)] ?? null
}
