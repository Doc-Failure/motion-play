import { afterEach, describe, expect, it, vi } from 'vitest'
import { syncOfflineCaching } from '../src/app/offlineCache'

describe('optional offline caching', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'serviceWorker')
    Reflect.deleteProperty(window, 'caches')
  })

  it('registers the local service worker only when enabled', async () => {
    const register = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register } })
    await syncOfflineCaching(true)
    expect(register).toHaveBeenCalledWith('./sw.js')
  })

  it('unregisters workers and removes only Motion Play caches when disabled', async () => {
    const unregisterMotionPlay = vi.fn().mockResolvedValue(true)
    const unregisterAnotherApp = vi.fn().mockResolvedValue(true)
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistrations: vi.fn().mockResolvedValue([
      { active: { scriptURL: new URL('./sw.js', window.location.href).href }, unregister: unregisterMotionPlay },
      { active: { scriptURL: new URL('./another-app-sw.js', window.location.href).href }, unregister: unregisterAnotherApp },
    ]) } })
    const deleteCache = vi.fn().mockResolvedValue(true)
    Object.defineProperty(window, 'caches', { configurable: true, value: { keys: vi.fn().mockResolvedValue(['motion-play-shell-v1', 'another-app']), delete: deleteCache } })
    await syncOfflineCaching(false)
    expect(unregisterMotionPlay).toHaveBeenCalledOnce()
    expect(unregisterAnotherApp).not.toHaveBeenCalled()
    expect(deleteCache).toHaveBeenCalledWith('motion-play-shell-v1')
    expect(deleteCache).not.toHaveBeenCalledWith('another-app')
  })
})
