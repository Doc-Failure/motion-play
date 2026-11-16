import { createServer, type Server } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test } from './fixtures'

let server: Server
let origin: string

test.beforeAll(async () => {
  const report = JSON.parse(await readFile(resolve('dist/release-report.json'), 'utf8').catch(() => {
    throw new Error('Run `npm run build` successfully before the offline browser test.')
  })) as { files: { path: string }[] }
  const files = new Set([...report.files.map(file => `/${file.path}`), '/sw.js'])
  server = createServer((request, response) => {
    const pathname = new URL(request.url!, 'http://localhost').pathname
    const path = pathname === '/' ? '/index.html' : pathname
    if (!files.has(path)) { response.writeHead(404).end(); return }
    const extension = path.split('.').pop()!
    const mime: Record<string, string> = { js: 'text/javascript', mjs: 'text/javascript', wasm: 'application/wasm', css: 'text/css', svg: 'image/svg+xml', webp: 'image/webp', ttf: 'font/ttf', webmanifest: 'application/manifest+json', txt: 'text/plain', html: 'text/html' }
    void readFile(resolve('dist', path.slice(1))).then(bytes => {
      response.writeHead(200, { 'Content-Type': mime[extension] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(bytes)
    }).catch(() => response.writeHead(500).end())
  })
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Local preview did not start')
  origin = `http://127.0.0.1:${address.port}`
})

test.afterAll(async () => {
  if (server?.listening) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
})

test('opted-in production shell reloads offline with art/fonts and removes only its own cache on opt-out', async ({ page, context, installMockCamera }) => {
  await installMockCamera({ denied: true })
  await page.addInitScript(() => {
    if (!localStorage.getItem('motion-play:settings:v1')) localStorage.setItem('motion-play:settings:v1', JSON.stringify({ soundEnabled: false, reducedMotion: false, offlineCaching: true }))
  })
  await page.goto(origin)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }))
    await caches.open('another-app')
  })
  // A controlled iframe navigation must load its own document, not index.html.
  // Load only the runtime here; this does not run inference or certify tracking.
  expect(await page.evaluate(async () => {
    const keys = await caches.keys()
    const shell = await caches.open(keys.find(key => key.startsWith('motion-play-shell-'))!)
    const precached = await shell.keys()
    if (precached.some(request => new URL(request.url).pathname.startsWith('/pose/'))) return false
    const frame = document.createElement('iframe')
    frame.src = './pose/tracker.html'
    try {
      await new Promise<void>((resolve, reject) => {
        frame.onload = () => resolve()
        frame.onerror = () => reject(new Error('Local runtime document did not load'))
        document.body.append(frame)
      })
      const runtime = frame.contentWindow as (Window & { createLocalPoseTracker?: unknown }) | null
      return frame.contentDocument?.title === 'Local body tracking runtime'
        && typeof runtime?.createLocalPoseTracker === 'function'
    } finally { frame.remove() }
  })).toBe(true)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Motion Play!' })).toBeVisible()
  expect(await page.evaluate(async () => {
    await document.fonts.ready
    return document.fonts.check('16px "Motion Hand"') && Array.from(document.images).every(image => image.complete && image.naturalWidth > 0)
  })).toBe(true)
  await page.getByRole('link', { name: /Game Catalog/ }).click()
  await page.getByRole('link', { name: 'Play Paper Dojo', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Camera permission is blocked')
  await page.getByRole('button', { name: 'Play without camera', exact: true }).click()
  await expect(page.locator('.dojo-game')).toBeVisible()
  await page.evaluate(() => localStorage.setItem('motion-play:settings:v1', JSON.stringify({ soundEnabled: false, reducedMotion: false, offlineCaching: false })))
  await page.reload()
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0)
  await expect.poll(() => page.evaluate(() => caches.keys())).toEqual(['another-app'])
})
