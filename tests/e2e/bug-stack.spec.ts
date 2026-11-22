import { devices } from '@playwright/test'
import { expect, openApp, test } from './fixtures'

test.use({ launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] } })

test('desktop keeps the catalog even in a phone-sized window', async ({ page, installMockCamera }) => {
  await installMockCamera({ denied: true })
  await page.addInitScript(() => sessionStorage.setItem('motion-play:players:v1', '1'))
  await page.setViewportSize({ width: 390, height: 844 })
  await openApp(page, '#/catalog')
  await expect(page.getByRole('heading', { name: 'Game Catalog' })).toBeAttached()
  await page.evaluate(() => { location.hash = '/bug-stack' })
  await expect(page.getByRole('link', { name: /Game Catalog/ })).toBeVisible()
  await expect(page.locator('.bug-stack')).toHaveCount(0)
})

test.describe('phone', () => {
  const { userAgent, viewport } = devices['iPhone 13']
  test.use({ userAgent, viewport, hasTouch: true })
  test('deep links open Bug Stack, recover from camera denial and play by touch', async ({ page, installMockCamera }) => {
    await installMockCamera({ denied: true })
    await openApp(page, '#/tournament')
    await expect(page.getByRole('heading', { name: 'Bug Stack' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Catalog/ })).toHaveCount(0)
    await page.screenshot({ path: test.info().outputPath('mobile-start.png') })
    await page.getByRole('button', { name: 'Play with camera' }).click()
    await expect(page.getByRole('alert')).toContainText('Allow camera access')
    await page.getByRole('button', { name: 'Retry camera' }).click()
    await page.getByRole('button', { name: 'Continue by touch' }).click()
    await page.getByRole('button', { name: 'drop', exact: true }).click()
    await expect(page.locator('dd').first()).not.toHaveText('0')
    await page.getByRole('button', { name: 'Pause' }).click()
    await page.getByRole('button', { name: 'Resume' }).click()
    await page.setViewportSize({ width: 844, height: 390 })
    await expect(page.getByRole('button', { name: 'rotate' })).toBeInViewport()
    await expect(page.locator('.bug-board')).toBeInViewport({ ratio: .99 })
  })
  test('bundled detector starts on synthetic video and waits for a hand', async ({ page, installMockCamera }) => {
    await installMockCamera()
    const assets: string[] = []
    page.on('request', request => assets.push(request.url()))
    await openApp(page, '#/')
    await page.getByRole('button', { name: 'Play with camera' }).click()
    await expect(page.getByRole('status')).toHaveText('Show one hand', { timeout: 20000 })
    const before = await page.locator('.bug-board').innerHTML()
    await page.waitForTimeout(1200)
    await expect(page.getByRole('status')).toHaveText('Show one hand')
    expect(await page.locator('.bug-board').innerHTML()).toBe(before)
    expect(assets.some(url => url.endsWith('/hand_landmarker.task'))).toBe(true)
    expect(assets.some(url => url.endsWith('/pose_landmarker_lite.task'))).toBe(false)
  })
  test('a measured hand steers and drops a piece through the camera path', async ({ page, installMockCamera }) => {
    await installMockCamera()
    await openApp(page, '#/catalog', async () => {
      await page.route('**/pose/tracker.js', route => route.fulfill({ contentType: 'text/javascript', body: `
        let frames = 0
        window.createLocalHandTracker = async () => ({ close() {}, detect() {
          const y = parent.swiping && ++frames % 8 >= 4 ? .6 : .25
          const points = Array.from({length:21}, () => ({ x: .8, y }))
          points[5].x -= .05; points[17].x += .05; points[8].x += .09
          return [{points, confidence:.96, side:'Right'}]
        } })
      ` }))
    })
    await page.getByRole('button', { name: 'Play with camera' }).click()
    await expect(page.getByRole('status')).toHaveText('Hand found')
    await expect.poll(() => page.locator('.bug-board').evaluate(board =>
      Array.from(board.children).findIndex(cell => cell.classList.contains('tile')) % 10)).toBeLessThan(4)
    await page.evaluate(() => { Object.assign(window, { swiping: true }) })
    await expect(page.locator('dd').first()).not.toHaveText('0')
    await page.getByRole('button', { name: 'Pause' }).click()
    await expect(page.locator('iframe')).toHaveCount(0)
    await expect.poll(() => page.evaluate(() =>
      (window as unknown as { __mockMediaState: { stoppedTracks: number } }).__mockMediaState.stoppedTracks)).toBe(1)
  })
})
