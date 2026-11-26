import { visibleCatalogGames } from '../../src/app/catalog'
import { completeReadyGate, expect, openApp, test } from './fixtures'

type LifecycleState = { frames: Set<number>; notes: number; lastVideo?: HTMLVideoElement }
type LifecycleWindow = typeof window & { __lifecycle: LifecycleState; __mockMediaState: { requests: number; stoppedTracks: number } }

test('browser Back releases game loops, sound and video consumers while retaining one camera for webcam navigation', async ({ page, installMockCamera }) => {
  test.setTimeout(120_000)
  await installMockCamera({ person: true })
  await page.addInitScript(() => {
    const state: LifecycleState = { frames: new Set(), notes: 0 }
    Object.assign(window, { __lifecycle: state })
    const request = window.requestAnimationFrame.bind(window)
    const cancel = window.cancelAnimationFrame.bind(window)
    window.requestAnimationFrame = callback => {
      const id = request(time => { state.frames.delete(id); callback(time) })
      state.frames.add(id)
      return id
    }
    window.cancelAnimationFrame = id => { state.frames.delete(id); cancel(id) }
    const create = AudioContext.prototype.createOscillator
    AudioContext.prototype.createOscillator = function () {
      const voice = create.call(this), start = voice.start.bind(voice)
      voice.start = (...args) => { state.notes++; start(...args) }
      return voice
    }
  })
  await openApp(page, '#/catalog')
  for (const game of visibleCatalogGames) {
    await page.getByRole('link', { name: `Play ${game.title}`, exact: true }).click()
    await page.getByRole('button',{name:'4 players',exact:true}).click()
    await completeReadyGate(page)
    const video = page.getByLabel('Mirrored live camera during gameplay')
    await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).videoWidth)).toBe(320)
    await page.waitForTimeout(3300)
    expect(await page.evaluate(() => (window as LifecycleWindow).__lifecycle.frames.size)).toBeGreaterThan(0)
    await page.evaluate(() => {
      const state = (window as LifecycleWindow).__lifecycle
      state.lastVideo = document.querySelector('.game-camera') as HTMLVideoElement
    })
    expect(await page.getByLabel('Mirrored camera preview').evaluate(element => (element as HTMLVideoElement).srcObject)).toBeNull()

    await page.goBack()
    await expect(page.getByRole('heading', { name: 'Game Catalog', exact: true })).toBeVisible()
    await expect(page.locator('.camera-play')).toHaveCount(0)
    await expect(page.getByLabel('Mirrored navigation camera')).toBeVisible()
    const after = await page.evaluate(() => {
      const { __lifecycle: state, __mockMediaState: media } = window as LifecycleWindow
      return { frames: state.frames.size, notes: state.notes, requests: media.requests, stoppedTracks: media.stoppedTracks,
        detached: state.lastVideo?.srcObject === null && Array.from(document.querySelectorAll<HTMLVideoElement>('video:not([aria-label="Mirrored navigation camera"])')).every(video => video.srcObject === null) }
    })
    expect(after).toMatchObject({ frames: 0, requests: 1, stoppedTracks: 0, detached: true })
    expect(after.notes).toBeGreaterThan(0)
    await page.waitForTimeout(500)
    expect(await page.evaluate(() => (window as LifecycleWindow).__lifecycle.notes)).toBe(after.notes)
  }
  // Reopening a game restores its intro, using a fresh player selection and the retained live track.
  await page.getByRole('link', { name: 'Play Paper Dojo', exact: true }).click()
  await page.getByRole('button',{name:'4 players',exact:true}).click()
  await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:/^Ready Player /})).toHaveCount(4)
  expect(await page.evaluate(() => (window as LifecycleWindow).__mockMediaState.requests)).toBe(1)
})
