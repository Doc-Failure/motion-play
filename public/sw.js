/* global self, caches, URL, fetch */
const CACHE_NAME = 'motion-play-shell-v1'

async function precacheShell() {
  const cache = await caches.open(CACHE_NAME)
  const indexResponse = await fetch('./index.html')
  const markup = await indexResponse.clone().text()
  const assetPaths = [...markup.matchAll(/(?:src|href)="([^"#]+)"/g)]
    .map((match) => new URL(match[1], self.location.href))
    .filter((url) => url.origin === self.location.origin)
    .map((url) => url.href)
  await cache.put('./index.html', indexResponse)
  await cache.addAll(['./', './manifest.webmanifest', ...new Set(assetPaths)])
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('motion-play-') && key !== CACHE_NAME).map((key) => caches.delete(key)))))
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone()
      caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy))
      return response
    }).catch(() => caches.match('./index.html')))
    return
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
    return response
  })))
})
