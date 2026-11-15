import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ACHIEVEMENTS_KEY, defaultSettings, loadAchievements, loadSettings, saveSettings, SETTINGS_KEY, unlockAchievement } from '../src/app/localPreferences'

describe('local preferences', () => {
  beforeEach(() => window.localStorage.clear())

  it('uses safe defaults for absent or malformed settings', () => {
    expect(loadSettings()).toEqual(defaultSettings)
    window.localStorage.setItem(SETTINGS_KEY, '{bad json')
    expect(loadSettings()).toEqual(defaultSettings)
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ reducedMotion: true }))
    expect(loadSettings()).toEqual({ ...defaultSettings, reducedMotion: true })
  })

  it('round trips settings in local storage', () => {
    const settings = { soundEnabled: false, reducedMotion: true, offlineCaching: true }
    saveSettings(settings)
    expect(loadSettings()).toEqual(settings)
  })

  it('keeps local play available when the browser denies storage access', () => {
    const localStorage = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage is unavailable', 'SecurityError')
    })
    expect(loadSettings()).toEqual(defaultSettings)
    expect(loadAchievements()).toEqual([])
    expect(() => saveSettings(defaultSettings)).not.toThrow()
    expect(() => unlockAchievement('catalog-explorer')).not.toThrow()
    localStorage.mockRestore()
  })

  it('stores achievements once and rejects malformed stored records', () => {
    const unlocked = unlockAchievement('catalog-explorer', new Date('2026-11-15T10:00:00.000Z'))
    expect(unlocked).toEqual([{ id: 'catalog-explorer', unlockedAt: '2026-11-15T10:00:00.000Z' }])
    expect(unlockAchievement('catalog-explorer')).toEqual(unlocked)
    window.localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([{ id: 'unknown', unlockedAt: 4 }]))
    expect(loadAchievements()).toEqual([])
  })
})
