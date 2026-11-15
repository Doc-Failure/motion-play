export const OFFLINE_CACHE_PREFIX = 'motion-play-'

const isMotionPlayWorker = (registration: ServiceWorkerRegistration) => {
  const expectedUrl = new URL('./sw.js', window.location.href).href
  return [registration.installing, registration.waiting, registration.active]
    .some((worker) => worker?.scriptURL === expectedUrl)
}

export async function syncOfflineCaching(enabled: boolean) {
  if (!('serviceWorker' in navigator)) return
  if (enabled) {
    await navigator.serviceWorker.register('./sw.js')
    return
  }
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(registrations.filter(isMotionPlayWorker).map((registration) => registration.unregister()))
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.filter((key) => key.startsWith(OFFLINE_CACHE_PREFIX)).map((key) => caches.delete(key)))
  }
}
