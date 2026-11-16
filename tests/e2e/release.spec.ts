import { expect, openApp, test } from './fixtures'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

test('production stays local, requests no microphone and blocks network data connections', async ({ page, installMockCamera }) => {
  const requests: { url: string; method: string }[] = []
  const errors: string[] = []
  page.on('request', request => requests.push({ url: request.url(), method: request.method() }))
  page.on('pageerror', error => errors.push(error.message))
  await installMockCamera({ person: true })
  await openApp(page, '#/')
  expect(await page.evaluate(() => (window as typeof window & { __mockMediaState: { requests: number } }).__mockMediaState.requests)).toBe(0)
  await page.getByRole('link', { name: /Game Catalog/ }).click()
  await page.getByRole('link', { name: 'Play Paper Dojo', exact: true }).click()
  await page.getByRole('button', { name: '4 players', exact: true }).click()
  await page.getByRole('button', { name: 'Play Paper Dojo', exact: true }).click()
  await expect(page.locator('.dojo-game')).toBeVisible()
  await page.waitForTimeout(3300)
  const diagnostics = await page.evaluate(async () => {
    const times: number[] = []
    await new Promise<void>(resolve => {
      const sample = (time: number) => {
        times.push(time)
        if (times.length < 91) requestAnimationFrame(sample)
        else resolve()
      }
      requestAnimationFrame(sample)
    })
    const intervals = times.slice(1).map((time, index) => time - times[index]).sort((a, b) => a - b)
    const state = (window as typeof window & { __mockMediaState: { requests: number; audioRequests: number } }).__mockMediaState
    return { engine: navigator.userAgent, viewport: { width: innerWidth, height: innerHeight },
      syntheticCamera: true, sampleCount: intervals.length, medianFrameMs: intervals[45], p95FrameMs: intervals[85],
      mediaRequests: state.requests, audioRequests: state.audioRequests,
      storageKeys: Object.keys(localStorage), serviceWorkers: 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0 }
  })
  const diagnosticsPath = test.info().outputPath('synthetic-four-player-frame-cadence.json')
  await mkdir(dirname(diagnosticsPath), { recursive: true })
  await writeFile(diagnosticsPath, `${JSON.stringify(diagnostics, null, 2)}\n`)
  await test.info().attach('synthetic-four-player-frame-cadence.json', { path: diagnosticsPath, contentType: 'application/json' })
  expect(diagnostics.mediaRequests).toBe(1)
  expect(diagnostics.audioRequests).toBe(0)
  expect(diagnostics.serviceWorkers).toBe(0)
  expect(diagnostics.storageKeys.every(key => key.startsWith('motion-play:'))).toBe(true)
  expect(requests.every(request => new URL(request.url).origin === 'http://motion-play.test' && request.method === 'GET')).toBe(true)
  expect(errors).toEqual([])
  // Deliberate probes must reject before any request reaches the network.
  const blocked = await page.evaluate(async () => Promise.all(['/privacy-probe', 'https://example.invalid/privacy-probe'].map(async url => {
    try { await fetch(url, { method: 'POST', body: 'synthetic-probe' }); return false } catch { return true }
  })))
  expect(blocked).toEqual([true, true])
})
