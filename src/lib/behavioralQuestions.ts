import type { BehavioralCategory } from '../db/types'

/** Who the question is best suited for when preparing STAR stories. */
export type BehavioralExperienceLevel = 'no-experience' | 'experienced' | 'both'

/** Amazon Leadership Principles — used to filter the interview question bank. */
export type AmazonLeadershipPrinciple =
  | 'Customer Obsession'
  | 'Ownership'
  | 'Bias for Action'
  | 'Have Backbone; Disagree and Commit'
  | 'Invent and Simplify'
  | 'Dive Deep'
  | 'Are Right, A Lot'
  | 'Deliver Results'
  | 'Think Big'
  | 'Hire and Develop the Best'
  | 'Frugality'
  | 'Learn and Be Curious'
  | 'Insist on the Highest Standards'
  | 'Earn Trust'
  | "Strive to be Earth's Best Employer"
  | 'Success and Scale Bring Broad Responsibility'

export const AMAZON_LEADERSHIP_PRINCIPLES: AmazonLeadershipPrinciple[] = [
  'Customer Obsession',
  'Ownership',
  'Bias for Action',
  'Have Backbone; Disagree and Commit',
  'Invent and Simplify',
  'Dive Deep',
  'Are Right, A Lot',
  'Deliver Results',
  'Think Big',
  'Hire and Develop the Best',
  'Frugality',
  'Learn and Be Curious',
  'Insist on the Highest Standards',
  'Earn Trust',
  "Strive to be Earth's Best Employer",
  'Success and Scale Bring Broad Responsibility',
]

export interface BehavioralQuestion {
  id: string
  text: string
  category: BehavioralCategory
  experience: BehavioralExperienceLevel
  /** Which bundled study guide this came from. */
  source:
    | 'amazon-study'
    | 'star-method'
    | 'leadership-principles'
    | 'amazon-interview-bank'
  /** Primary Leadership Principle this question tests (Amazon interviews). */
  lp?: AmazonLeadershipPrinciple
  /** Among the most frequently asked across Amazon roles — prep these first. */
  essential?: boolean
  /** Especially common for software development engineer interviews. */
  sde?: boolean
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

/** Condensed prep tips from Amazon behavioral interview guides. */
export const BEHAVIORAL_PREP_TIPS = [
  {
    title: 'Use "I", not "we"',
    body: 'Interviewers need your specific contribution. Balance team context with clear personal impact — especially for IC roles.',
  },
  {
    title: 'Expect follow-up probes',
    body: 'Bar Raisers "dive deep" — prepare extra layers for each story (trade-offs, metrics, what you would do differently).',
  },
  {
    title: 'Answer structure: STAR or SPSIL',
    body: 'Situation → Task/Problem → Action/Solution → Result/Impact → Lessons learned. Keep setup under ~30 seconds.',
  },
  {
    title: 'Map stories to 4–6 Leadership Principles',
    body: 'Each answer should demonstrate multiple LPs. Prepare at least one story per principle plus a few flex stories.',
  },
  {
    title: 'Quantify results',
    body: 'Use metrics: time saved, revenue, error rates, customer impact, scale. Amazon is data-driven even in behavioral rounds.',
  },
  {
    title: 'Failures need lessons',
    body: 'Do not hide mistakes. Show accountability, what you learned, and how you changed behavior afterward.',
  },
] as const

/** IDs of the top questions to prep first (Amazon + STAR + interview bank). */
export const TOP_ESSENTIAL_QUESTION_IDS = [
  'essential-why-amazon',
  'amz-2',
  'essential-challenge',
  'essential-disagree',
  'essential-deadline',
  'sde-ownership-critical',
  'br-obstacles',
  'br-limited-resources',
] as const

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

function q(
  partial: Omit<BehavioralQuestion, 'source'> & {
    source?: BehavioralQuestion['source']
  },
): BehavioralQuestion {
  return { source: 'amazon-interview-bank', ...partial }
}

/** Curated from AZ PDFs + Amazon SDE behavioral interview bank. */
export const BEHAVIORAL_QUESTIONS: BehavioralQuestion[] = [
  // ── Top essentials (prep first) ──
  q({
    id: 'essential-why-amazon',
    text: 'Why Amazon?',
    category: 'Influence',
    experience: 'both',
    lp: 'Customer Obsession',
    essential: true,
    source: 'amazon-interview-bank',
  }),
  q({
    id: 'essential-challenge',
    text: 'Tell me about a challenge you faced. What was your role and the outcome?',
    category: 'Ambiguity',
    experience: 'both',
    lp: 'Deliver Results',
    essential: true,
  }),
  q({
    id: 'essential-disagree',
    text: 'Tell me about a time you disagreed with a coworker, manager, or decision.',
    category: 'Conflict',
    experience: 'both',
    lp: 'Have Backbone; Disagree and Commit',
    essential: true,
    sde: true,
  }),
  q({
    id: 'essential-deadline',
    text: 'Tell me about a time you had to work or make a decision quickly under a tight deadline.',
    category: 'Deadlines',
    experience: 'both',
    lp: 'Bias for Action',
    essential: true,
    sde: true,
  }),

  // ── Bar Raiser favorites ──
  q({
    id: 'br-obstacles',
    text: 'Tell me about a time when you had significant obstacles delivering a project.',
    category: 'Deadlines',
    experience: 'experienced',
    lp: 'Deliver Results',
    essential: true,
    sde: true,
  }),
  q({
    id: 'br-limited-resources',
    text: 'Tell me about a time when you had to deliver something with very limited resources or tight constraints.',
    category: 'Ownership',
    experience: 'both',
    lp: 'Frugality',
    essential: true,
    sde: true,
  }),
  q({
    id: 'br-missed-commitment',
    text: 'Tell me about a time when you realized you were not able to meet a commitment on a long-lasting project. How did you navigate the situation?',
    category: 'Ownership',
    experience: 'experienced',
    lp: 'Ownership',
    sde: true,
  }),

  // ── Original AZ / STAR questions (enriched with LP where clear) ──
  {
    id: 'amz-1',
    text: 'Tell me about a time when you were faced with a problem that had a number of possible solutions. What was the problem and how did you determine the course of action? What was the outcome?',
    category: 'Ambiguity',
    experience: 'both',
    source: 'amazon-study',
    lp: 'Are Right, A Lot',
    sde: true,
  },
  {
    id: 'amz-2',
    text: 'When did you take a risk, make a mistake, or fail? How did you respond, and how did you grow from that experience?',
    category: 'Failure',
    experience: 'both',
    source: 'amazon-study',
    lp: 'Learn and Be Curious',
    essential: true,
  },
  {
    id: 'amz-3',
    text: 'Describe a time you took the lead on a project.',
    category: 'Leadership',
    experience: 'both',
    source: 'amazon-study',
    lp: 'Ownership',
  },
  {
    id: 'amz-4',
    text: 'What did you do when you needed to motivate a group of individuals or promote collaboration on a particular project?',
    category: 'Teamwork',
    experience: 'experienced',
    source: 'amazon-study',
    lp: 'Earn Trust',
  },
  {
    id: 'amz-5',
    text: 'How have you leveraged data to develop a strategy?',
    category: 'Influence',
    experience: 'experienced',
    source: 'amazon-study',
    lp: 'Dive Deep',
  },

  // ── Customer Obsession ──
  q({
    id: 'lp-co-1',
    text: 'Tell me about a time you had to deal with a difficult customer.',
    category: 'Conflict',
    experience: 'both',
    lp: 'Customer Obsession',
  }),
  q({
    id: 'lp-co-2',
    text: 'Which company has the best customer service and why?',
    category: 'Influence',
    experience: 'both',
    lp: 'Customer Obsession',
  }),
  q({
    id: 'lp-co-3',
    text: 'Describe a time when a customer asked you for one thing, but you knew they needed something else.',
    category: 'Influence',
    experience: 'experienced',
    lp: 'Customer Obsession',
  }),
  q({
    id: 'lp-co-4',
    text: 'Tell me about one of your projects where you put the customer first.',
    category: 'Ownership',
    experience: 'both',
    lp: 'Customer Obsession',
    sde: true,
  }),
  q({
    id: 'lp-co-5',
    text: 'Tell me about a time you went above and beyond for a customer.',
    category: 'Ownership',
    experience: 'both',
    lp: 'Customer Obsession',
    sde: true,
  }),
  q({
    id: 'lp-co-6',
    text: 'What is the most difficult customer situation you have had, and how did you handle it?',
    category: 'Conflict',
    experience: 'both',
    lp: 'Customer Obsession',
  }),
  q({
    id: 'lp-co-7',
    text: 'Tell me about a time when you could not meet a customer demand.',
    category: 'Failure',
    experience: 'experienced',
    lp: 'Customer Obsession',
  }),

  // ── Ownership ──
  q({
    id: 'lp-own-1',
    text: "Tell me about a time you did something at work that wasn't your responsibility / in your job description.",
    category: 'Ownership',
    experience: 'both',
    lp: 'Ownership',
    sde: true,
  }),
  q({
    id: 'lp-own-2',
    text: 'Tell me about a time when you had to make an important decision without approval from your boss.',
    category: 'Ambiguity',
    experience: 'experienced',
    lp: 'Ownership',
  }),
  q({
    id: 'lp-own-3',
    text: 'How would you make Amazon.com better?',
    category: 'Influence',
    experience: 'both',
    lp: 'Customer Obsession',
  }),
  q({
    id: 'sde-ownership-critical',
    text: 'Tell me about a situation where you took ownership of a critical issue.',
    category: 'Ownership',
    experience: 'both',
    lp: 'Ownership',
    essential: true,
    sde: true,
  }),
  q({
    id: 'lp-own-4',
    text: 'Tell me about a time when you took complete ownership of a project and drove it to completion despite obstacles.',
    category: 'Ownership',
    experience: 'both',
    lp: 'Ownership',
    sde: true,
  }),

  // ── Bias for Action ──
  q({
    id: 'lp-bfa-1',
    text: 'Tell me about a time you had to make an urgent decision without data.',
    category: 'Ambiguity',
    experience: 'experienced',
    lp: 'Bias for Action',
  }),
  q({
    id: 'lp-bfa-2',
    text: 'Tell me about a time when you launched a feature with known risks.',
    category: 'Leadership',
    experience: 'experienced',
    lp: 'Bias for Action',
    sde: true,
  }),
  q({
    id: 'lp-bfa-3',
    text: 'Tell me about a time when you found an opportunity that no one else saw.',
    category: 'Leadership',
    experience: 'experienced',
    lp: 'Bias for Action',
  }),
  q({
    id: 'lp-bfa-4',
    text: 'Can you describe a time that you had to pivot?',
    category: 'Ambiguity',
    experience: 'both',
    lp: 'Bias for Action',
    sde: true,
  }),
  q({
    id: 'lp-bfa-5',
    text: 'Tell me about a time you made a hard decision.',
    category: 'Ambiguity',
    experience: 'both',
    lp: 'Bias for Action',
    sde: true,
  }),
  q({
    id: 'lp-bfa-6',
    text: 'Tell me about a time you had to work with incomplete data or incomplete information.',
    category: 'Ambiguity',
    experience: 'both',
    lp: 'Bias for Action',
  }),
  q({
    id: 'lp-bfa-7',
    text: 'Tell me about a time you saw an issue your team could face and proactively took action to mitigate it.',
    category: 'Ownership',
    experience: 'both',
    lp: 'Bias for Action',
    sde: true,
  }),

  // ── Have Backbone; Disagree and Commit ──
  q({
    id: 'lp-hb-1',
    text: 'Tell me about a time you had a conflict with a coworker or manager and how you approached it.',
    category: 'Conflict',
    experience: 'both',
    lp: 'Have Backbone; Disagree and Commit',
    sde: true,
  }),
  q({
    id: 'lp-hb-2',
    text: 'Tell me about a time your work was criticized.',
    category: 'Learning',
    experience: 'both',
    lp: 'Have Backbone; Disagree and Commit',
  }),
  q({
    id: 'lp-hb-3',
    text: "Tell me about a time when people on your team didn't agree with you.",
    category: 'Conflict',
    experience: 'both',
    lp: 'Have Backbone; Disagree and Commit',
  }),
  q({
    id: 'sde-manager-challenge',
    text: 'Tell me about a time when your manager challenged you to think differently.',
    category: 'Learning',
    experience: 'both',
    lp: 'Learn and Be Curious',
    sde: true,
  }),
  q({
    id: 'lp-hb-4',
    text: 'Have you ever stood against your boss to address a customer situation? Why and how?',
    category: 'Conflict',
    experience: 'experienced',
    lp: 'Have Backbone; Disagree and Commit',
  }),
  q({
    id: 'lp-hb-5',
    text: 'Tell me about a time you had to persuade a stakeholder to take a different approach.',
    category: 'Influence',
    experience: 'experienced',
    lp: 'Have Backbone; Disagree and Commit',
  }),
  q({
    id: 'lp-hb-6',
    text: 'Tell me about a time when you had to stand up to your manager.',
    category: 'Conflict',
    experience: 'experienced',
    lp: 'Have Backbone; Disagree and Commit',
  }),

  // ── Invent and Simplify ──
  q({
    id: 'lp-inv-1',
    text: 'Tell me about a time you re-designed a process and why.',
    category: 'Influence',
    experience: 'experienced',
    lp: 'Invent and Simplify',
  }),
  q({
    id: 'sde-simple-solution',
    text: 'Tell us about a time where you solved a really complex problem with a simple solution.',
    category: 'Influence',
    experience: 'both',
    lp: 'Invent and Simplify',
    sde: true,
  }),
  q({
    id: 'lp-inv-2',
    text: 'Tell me about a time when you had a plan but ran into obstacles. What did you do?',
    category: 'Ambiguity',
    experience: 'both',
    lp: 'Invent and Simplify',
  }),

  // ── Dive Deep ──
  q({
    id: 'lp-dd-1',
    text: 'Tell me about a project in which you had to deep dive into analysis.',
    category: 'Learning',
    experience: 'experienced',
    lp: 'Dive Deep',
    sde: true,
  }),
  q({
    id: 'lp-dd-2',
    text: 'Tell me about the most complex problem you have worked on.',
    category: 'Learning',
    experience: 'both',
    lp: 'Dive Deep',
    sde: true,
  }),
  q({
    id: 'lp-dd-3',
    text: 'Tell me about a time when you used a lot of data in a short period of time.',
    category: 'Learning',
    experience: 'experienced',
    lp: 'Dive Deep',
  }),
  q({
    id: 'lp-dd-4',
    text: 'How do you ramp up to learn a new space or area in a project?',
    category: 'Learning',
    experience: 'both',
    lp: 'Dive Deep',
    sde: true,
  }),
  q({
    id: 'lp-dd-5',
    text: 'Tell me about a time you managed a complex project well.',
    category: 'Leadership',
    experience: 'experienced',
    lp: 'Dive Deep',
  }),

  // ── Are Right, A Lot ──
  q({
    id: 'lp-ar-1',
    text: 'Tell me how you deal with ambiguity.',
    category: 'Ambiguity',
    experience: 'both',
    lp: 'Are Right, A Lot',
  }),
  q({
    id: 'lp-ar-2',
    text: 'Tell me about a time you applied judgment to a decision when data was not available.',
    category: 'Ambiguity',
    experience: 'experienced',
    lp: 'Are Right, A Lot',
  }),
  q({
    id: 'lp-ar-3',
    text: 'Describe a time when you had to make a decision against the suggestion of your larger team.',
    category: 'Conflict',
    experience: 'experienced',
    lp: 'Are Right, A Lot',
  }),

  // ── Deliver Results ──
  q({
    id: 'lp-dr-1',
    text: 'Tell me about a time you came across a scenario where the deadline given to you was earlier than expected.',
    category: 'Deadlines',
    experience: 'both',
    lp: 'Deliver Results',
    sde: true,
  }),
  q({
    id: 'lp-dr-2',
    text: "Tell me about the most challenging project you've ever worked on.",
    category: 'Deadlines',
    experience: 'both',
    lp: 'Deliver Results',
    sde: true,
  }),
  q({
    id: 'lp-dr-3',
    text: 'Tell me about a time when you had to handle pressure.',
    category: 'Deadlines',
    experience: 'both',
    lp: 'Deliver Results',
  }),
  q({
    id: 'lp-dr-4',
    text: 'Tell me a situation where you did not hit your goal. How did you manage that?',
    category: 'Failure',
    experience: 'both',
    lp: 'Deliver Results',
  }),
  q({
    id: 'lp-dr-5',
    text: 'Give me an example of a time when you not only exceeded a goal, but vastly surpassed it.',
    category: 'Ownership',
    experience: 'both',
    lp: 'Deliver Results',
    sde: true,
  }),
  q({
    id: 'sde-tight-deadline',
    text: 'Tell me about a time when you were able to deliver a project under a tight deadline.',
    category: 'Deadlines',
    experience: 'both',
    lp: 'Deliver Results',
    sde: true,
  }),
  q({
    id: 'sde-missed-deadline',
    text: 'Tell me about a time you missed a deadline. What did you do to handle the situation?',
    category: 'Failure',
    experience: 'both',
    lp: 'Deliver Results',
    sde: true,
  }),
  q({
    id: 'sde-sacrifice-deadline',
    text: 'Can you describe a situation where you had to make a personal sacrifice to meet a deadline?',
    category: 'Deadlines',
    experience: 'both',
    lp: 'Deliver Results',
    sde: true,
  }),

  // ── Think Big ──
  q({
    id: 'lp-tb-1',
    text: 'Tell me about your most significant accomplishment. Why was it significant?',
    category: 'Leadership',
    experience: 'both',
    lp: 'Think Big',
  }),
  q({
    id: 'lp-tb-2',
    text: 'Tell me about a time you proposed a non-intuitive solution to a problem and how you identified it required different thinking.',
    category: 'Influence',
    experience: 'experienced',
    lp: 'Think Big',
  }),
  q({
    id: 'lp-tb-3',
    text: "What was the largest project you've executed?",
    category: 'Leadership',
    experience: 'experienced',
    lp: 'Think Big',
  }),
  q({
    id: 'lp-tb-4',
    text: 'Tell me about a time when you challenged the status quo.',
    category: 'Leadership',
    experience: 'both',
    lp: 'Think Big',
    sde: true,
  }),

  // ── Learn and Be Curious ──
  q({
    id: 'lp-lc-1',
    text: 'Tell me about a time you had to learn something quickly.',
    category: 'Learning',
    experience: 'both',
    lp: 'Learn and Be Curious',
    sde: true,
  }),
  q({
    id: 'lp-lc-2',
    text: 'Tell me about your biggest career failure and what you learned from it.',
    category: 'Failure',
    experience: 'both',
    lp: 'Learn and Be Curious',
  }),
  q({
    id: 'lp-lc-3',
    text: 'Tell me about a time you taught yourself a skill.',
    category: 'Learning',
    experience: 'no-experience',
    lp: 'Learn and Be Curious',
  }),
  q({
    id: 'lp-lc-4',
    text: 'What did you learn recently?',
    category: 'Learning',
    experience: 'both',
    lp: 'Learn and Be Curious',
  }),
  q({
    id: 'sde-no-skills',
    text: 'Tell me about a time when you realized you did not have the skills needed to do the job.',
    category: 'Learning',
    experience: 'both',
    lp: 'Learn and Be Curious',
    sde: true,
  }),
  q({
    id: 'sde-harsh-criticism',
    text: 'Tell me about a time you received harsh criticism from your manager.',
    category: 'Learning',
    experience: 'both',
    lp: 'Earn Trust',
    sde: true,
  }),

  // ── Insist on the Highest Standards ──
  q({
    id: 'lp-ihs-1',
    text: 'Tell me about the most successful project you have done.',
    category: 'Ownership',
    experience: 'both',
    lp: 'Insist on the Highest Standards',
  }),
  q({
    id: 'lp-ihs-2',
    text: 'Tell me about a project that you wish you had done better, and how you would do it differently today.',
    category: 'Learning',
    experience: 'both',
    lp: 'Insist on the Highest Standards',
  }),
  q({
    id: 'lp-ihs-3',
    text: 'Tell me about a time you had to make a trade-off between sacrificing quality and delivering on time.',
    category: 'Deadlines',
    experience: 'experienced',
    lp: 'Insist on the Highest Standards',
    sde: true,
  }),

  // ── Earn Trust ──
  q({
    id: 'lp-et-1',
    text: 'How do you earn trust with a team?',
    category: 'Teamwork',
    experience: 'both',
    lp: 'Earn Trust',
  }),
  q({
    id: 'lp-et-2',
    text: 'Tell me a piece of difficult feedback you received and how you handled it.',
    category: 'Learning',
    experience: 'both',
    lp: 'Earn Trust',
    sde: true,
  }),
  q({
    id: 'lp-et-3',
    text: "Tell me about a time the team's trust was damaged and how you fixed it.",
    category: 'Conflict',
    experience: 'experienced',
    lp: 'Earn Trust',
  }),
  q({
    id: 'lp-et-4',
    text: 'How do you deal with negative feedback?',
    category: 'Learning',
    experience: 'both',
    lp: 'Earn Trust',
    sde: true,
  }),

  // ── Frugality ──
  q({
    id: 'lp-fr-1',
    text: 'Tell me about a time you successfully delivered a project with limited budget or resources.',
    category: 'Ownership',
    experience: 'both',
    lp: 'Frugality',
  }),
  q({
    id: 'lp-fr-2',
    text: 'Tell me about the last time you figured out a way to keep an approach simple or save on expenses.',
    category: 'Influence',
    experience: 'experienced',
    lp: 'Frugality',
  }),

  // ── STAR method classics (from original bank) ──
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
    lp: 'Are Right, A Lot',
  },
  {
    id: 'star-4',
    text: 'Give me an example of a time when you set a goal and were able to meet or achieve it.',
    category: 'Ownership',
    experience: 'no-experience',
    source: 'star-method',
    lp: 'Deliver Results',
  },
  {
    id: 'star-5',
    text: "Tell me about a time when you had to use your presentation skills to influence someone's opinion.",
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
    lp: 'Have Backbone; Disagree and Commit',
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
    lp: 'Ownership',
  },
  {
    id: 'star-9',
    text: 'Tell me about a time when you had too many things to do and you were required to prioritize your tasks.',
    category: 'Deadlines',
    experience: 'both',
    source: 'star-method',
    lp: 'Deliver Results',
  },
  {
    id: 'star-10',
    text: 'Give me an example of a time when you had to make a split second decision.',
    category: 'Ambiguity',
    experience: 'both',
    source: 'star-method',
    lp: 'Bias for Action',
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
    text: "Tell me about a difficult decision you've made in the last year.",
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
    lp: 'Learn and Be Curious',
  },
  {
    id: 'star-15',
    text: 'Give me an example of when you showed initiative and took the lead.',
    category: 'Leadership',
    experience: 'no-experience',
    source: 'star-method',
    lp: 'Ownership',
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
    lp: 'Dive Deep',
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
    lp: 'Bias for Action',
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

  // ── Early career ──
  q({
    id: 'early-1',
    text: 'Tell me about a group project (class, club, or volunteer) where you stepped up when the team was stuck.',
    category: 'Teamwork',
    experience: 'no-experience',
    source: 'star-method',
    lp: 'Ownership',
  }),
  q({
    id: 'early-2',
    text: 'Describe a time you balanced school, work, or personal commitments when everything was due at once.',
    category: 'Deadlines',
    experience: 'no-experience',
    source: 'star-method',
    lp: 'Deliver Results',
  }),
  q({
    id: 'early-3',
    text: 'Give an example from an internship, part-time job, or campus role where you learned something new fast.',
    category: 'Learning',
    experience: 'no-experience',
    source: 'star-method',
    lp: 'Learn and Be Curious',
  }),
  q({
    id: 'early-4',
    text: 'Tell me about a time you received tough feedback on a project or assignment. What did you change?',
    category: 'Learning',
    experience: 'no-experience',
    source: 'star-method',
    lp: 'Earn Trust',
  }),
  q({
    id: 'early-5',
    text: 'Describe a time you had to explain a technical or complex topic to someone non-technical.',
    category: 'Influence',
    experience: 'no-experience',
    source: 'star-method',
    lp: 'Customer Obsession',
  }),
]

export function filterBehavioralQuestions(
  questions: BehavioralQuestion[],
  opts: {
    experience?: BehavioralExperienceLevel | 'all'
    category?: BehavioralCategory | 'all'
    lp?: AmazonLeadershipPrinciple | 'all'
    essentialOnly?: boolean
    sdeOnly?: boolean
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
    if (opts.lp && opts.lp !== 'all' && item.lp !== opts.lp) {
      return false
    }
    if (opts.essentialOnly && !item.essential) return false
    if (opts.sdeOnly && !item.sde) return false
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

export function getEssentialQuestions(): BehavioralQuestion[] {
  const byId = new Map(BEHAVIORAL_QUESTIONS.map((item) => [item.id, item]))
  return TOP_ESSENTIAL_QUESTION_IDS.map((id) => byId.get(id)).filter(
    (item): item is BehavioralQuestion => Boolean(item),
  )
}
