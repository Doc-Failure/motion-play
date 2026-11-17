import { completeReadyGate, expect, openApp, releaseDirectory, test } from './fixtures'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

test('production stays local, requests no microphone and blocks network data connections', async ({ page, browser, installMockCamera }) => {
  const release = JSON.parse(await readFile(resolve(releaseDirectory, 'release-report.json'), 'utf8')) as { version: string }
  const requests: { url: string; method: string }[] = []
  const errors: string[] = []
  page.on('request', request => requests.push({ url: request.url(), method: request.method() }))
  page.on('pageerror', error => errors.push(error.message))
  await installMockCamera({ person: true })
  await openApp(page, '#/')
  await expect.poll(()=>page.evaluate(() => (window as typeof window & { __mockMediaState: { requests: number } }).__mockMediaState.requests)).toBe(1)
  await page.getByRole('button',{name:'4 players',exact:true}).click()
  await page.getByRole('link', { name: /Game Catalog/ }).click()
  await page.getByRole('link', { name: 'Play Paper Dojo', exact: true }).click()
  await completeReadyGate(page)
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
      poseDiagnosticStatus: document.querySelector('.body-test__status')?.textContent ?? null,
      poseRuntimePresent: Boolean(document.querySelector('iframe[title="Local body tracking runtime"]')),
      storageKeys: Object.keys(localStorage), serviceWorkers: 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0 }
  })
  const evidence = { ...diagnostics, releaseVersion: release.version, project: test.info().project.name, browserVersion: browser.version() }
  const diagnosticsPath = test.info().outputPath('synthetic-four-player-frame-cadence.json')
  await mkdir(dirname(diagnosticsPath), { recursive: true })
  await writeFile(diagnosticsPath, `${JSON.stringify(evidence, null, 2)}\n`)
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

test('diagnostic policy allows local assets while blocking external data connections and preserving the main policy', async ({ page, installMockCamera }) => {
  const escapedProbes: string[] = []
  // If a policy regresses, contain the deliberate probes inside the test too.
  await page.route('**/privacy-probe', async route => {
    escapedProbes.push(route.request().url())
    await route.fulfill({ status: 200, body: 'probe should have been blocked' })
  })
  await installMockCamera()
  await openApp(page, '#/')
  await page.evaluate(async () => {
    const frame = document.createElement('iframe')
    frame.title = 'Release privacy diagnostic'
    frame.name = 'release-privacy-diagnostic'
    frame.src = './pose/tracker.html'
    await new Promise<void>((resolve, reject) => {
      frame.onload = () => resolve()
      frame.onerror = () => reject(new Error('Diagnostic document failed to load'))
      document.body.append(frame)
    })
  })
  const runtime = page.frame({name:'release-privacy-diagnostic'})!
  expect(await runtime.evaluate(async () => {
    const local = await fetch('./README.txt')
    return local.ok && (await local.text()).includes('Optional local body-tracking diagnostic')
  })).toBe(true)
  expect(await runtime.evaluate(async () => Promise.all(['GET', 'POST'].map(async method => {
    try { await fetch('https://example.invalid/privacy-probe', { method }); return false } catch { return true }
  })))).toEqual([true, true])
  expect(await page.evaluate(async () => {
    try { await fetch('./pose/README.txt'); return false } catch { return true }
  })).toBe(true)
  expect(escapedProbes).toEqual([])
  await expect.poll(()=>page.evaluate(() => (window as typeof window & { __mockMediaState: { requests: number } }).__mockMediaState.requests)).toBe(1)
})
