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
    await cache.addAll([...assetUrls].filter(url => !new URL(url).pathname.includes('/pose/')))
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
  const shell = new URL('./index.html', self.registration.scope)
  const root = new URL('./', self.registration.scope)
  // Hash routes navigate within the root document. Other documents (including
  // the optional pose iframe) must retain their own HTML and privacy policy.
  const isShellNavigation = request.mode === 'navigate'
    && (url.pathname === root.pathname || url.pathname === shell.pathname)
  const target = isShellNavigation ? shell.href : url.href
  // Only packaged static files are read, never camera data or runtime responses.
  if (!assetUrls.has(target)) return
  event.respondWith((async () => {
    let cache
    try {
      cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(target)
      if (cached) return cached
    } catch {
      // Browser storage can become unavailable after an opt-in installation.
      // Keep online play usable even when opening or reading the cache fails.
    }
    // Storage eviction must not strand an online app behind an empty cache.
    const response = await fetch(target)
    // Quota/eviction failures must not discard a successfully fetched asset.
    if (response.ok && cache) await cache.put(target, response.clone()).catch(() => undefined)
    return response
  })())
})
