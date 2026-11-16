/* global self, caches, URL, fetch */
// Injected from the complete production artifact by scripts/release.mjs.
const RELEASE = null /* motion-play-release */
const CACHE_NAME = `motion-play-shell-${RELEASE?.version ?? 'unpackaged'}`
const assetUrls = new Set((RELEASE?.assets ?? []).map((path) => new URL(path, self.registration.scope).href))

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    if (!RELEASE) throw new Error('Build the release before enabling offline play.')
    const cache = await caches.open(CACHE_NAME)
    // Missing files fail installation; CSS images/fonts belong to the shell too.
    await cache.addAll([...assetUrls])
  })())
  // Updates wait for the previous app's tabs to close so active games retain
  // their matching HTML and assets. Do not force skipWaiting here.
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((key) => key.startsWith('motion-play-') && key !== CACHE_NAME).map((key) => caches.delete(key)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  const target = request.mode === 'navigate'
    ? new URL('./index.html', self.registration.scope).href
    : url.href
  // Only packaged static files are read, never camera data or runtime responses.
  if (!assetUrls.has(target)) return
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(target)
    if (cached) return cached
    // Storage eviction must not strand an online app behind an empty cache.
    const response = await fetch(target)
    if (response.ok) await cache.put(target, response.clone())
    return response
  })())
})
