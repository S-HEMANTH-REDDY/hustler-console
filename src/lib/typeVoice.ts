/** Five display voices. Assigned by what the tab is for; extras reuse. */
export type TypeVoice = 'script' | 'outline' | 'smallcaps' | 'gothic' | 'vapor'

export const TYPE_VOICE_LABEL: Record<TypeVoice, string> = {
  script: 'Script',
  outline: 'Outline',
  smallcaps: 'Small caps',
  gothic: 'Gothic',
  vapor: 'Vapor',
}

/**
 * Best-fit, then recycle:
 * Script  — personal / branding
 * Outline — high-visibility numbers
 * Small caps — clean professional lists & settings
 * Gothic  — dramatic career grind
 * Vapor   — retro, scroll-catching calendars & passion
 */
const VOICE_BY_PATH: Record<string, TypeVoice> = {
  '/': 'script',
  '/focus': 'outline',
  '/tasks': 'smallcaps',
  '/calendar': 'vapor',
  '/analytics': 'smallcaps',
  '/applications': 'gothic',
  '/behavioral': 'script',
  '/dsa': 'outline',
  '/system-design': 'gothic',
  '/passion': 'vapor',
  '/settings': 'smallcaps',
}

export function voiceForPath(pathname: string): TypeVoice {
  return VOICE_BY_PATH[pathname] ?? 'smallcaps'
}
