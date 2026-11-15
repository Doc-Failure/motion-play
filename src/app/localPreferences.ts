export const SETTINGS_KEY = 'motion-play:settings:v1'
export const ACHIEVEMENTS_KEY = 'motion-play:achievements:v1'

export type LocalSettings = {
  soundEnabled: boolean
  reducedMotion: boolean
  offlineCaching: boolean
}

export type AchievementId = 'catalog-explorer' | 'tournament-ready'

export type Achievement = {
  id: AchievementId
  unlockedAt: string
}

export const defaultSettings: LocalSettings = {
  soundEnabled: true,
  reducedMotion: false,
  offlineCaching: false,
}

const getStorage = (): Storage | undefined => {
  if (typeof window === 'undefined') return undefined
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

export function loadSettings(): LocalSettings {
  const storage = getStorage()
  if (!storage) return defaultSettings
  try {
    const value: unknown = JSON.parse(storage.getItem(SETTINGS_KEY) ?? 'null')
    if (!value || typeof value !== 'object') return defaultSettings
    const candidate = value as Partial<LocalSettings>
    return {
      soundEnabled: typeof candidate.soundEnabled === 'boolean' ? candidate.soundEnabled : defaultSettings.soundEnabled,
      reducedMotion: typeof candidate.reducedMotion === 'boolean' ? candidate.reducedMotion : defaultSettings.reducedMotion,
      offlineCaching: typeof candidate.offlineCaching === 'boolean' ? candidate.offlineCaching : defaultSettings.offlineCaching,
    }
  } catch {
    return defaultSettings
  }
}

export function saveSettings(settings: LocalSettings) {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Private browsing or a full storage quota must not prevent local play.
  }
}

export function loadAchievements(): Achievement[] {
  const storage = getStorage()
  if (!storage) return []
  try {
    const value: unknown = JSON.parse(storage.getItem(ACHIEVEMENTS_KEY) ?? '[]')
    if (!Array.isArray(value)) return []
    return value.filter((item): item is Achievement => {
      if (!item || typeof item !== 'object') return false
      const candidate = item as Partial<Achievement>
      return (candidate.id === 'catalog-explorer' || candidate.id === 'tournament-ready') && typeof candidate.unlockedAt === 'string'
    })
  } catch {
    return []
  }
}

export function unlockAchievement(id: AchievementId, now = new Date()): Achievement[] {
  const achievements = loadAchievements()
  if (achievements.some((achievement) => achievement.id === id)) return achievements
  const updated = [...achievements, { id, unlockedAt: now.toISOString() }]
  const storage = getStorage()
  if (!storage) return achievements
  try {
    storage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(updated))
  } catch {
    // Achievements are optional local progress; gameplay remains available.
  }
  return updated
}
