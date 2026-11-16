import { expect, openApp, test } from './fixtures'

for (const [slug, title] of [['bubble-battle', 'Bubble Battle'], ['window-wipe', 'Window Wipe'], ['whack-a-mole', 'Whack-a-Mole']]) {
  test(`${title} supports keyboard scoring, recovery and replay focus`, async ({ page, installMockCamera }) => {
    await page.clock.install({ time: new Date('2030-01-01T00:00:00Z') })
    await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'))
    await page.addInitScript(() => { Math.random = () => .5 })
    await installMockCamera({ denied: true })
    await openApp(page, `#/camera/${slug}`)
    await page.getByRole('button', { name: '4 players', exact: true }).click()
    await page.getByRole('button', { name: 'Play without camera', exact: true }).click()
    await page.clock.runFor(5000)
    const board = page.getByRole('group', { name: `Player 4 ${title} play area` })
    await board.focus()
    if (slug === 'bubble-battle') for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    const scores = page.locator('.bubble-game__header dd')
    const zero = slug === 'window-wipe' ? '0%' : '0'
    await expect(scores.nth(3)).not.toHaveText(zero)
    for (let i = 0; i < 3; i++) await expect(scores.nth(i)).toHaveText(zero)
    await expect(board).toBeFocused()
    await expect(board.locator('.keyboard-play-cursor')).toBeVisible()
    await expect(board.locator('.keyboard-play-help')).toBeInViewport()
    // Adding keyboard affordances must not create extra smudges/grid cells.
    if (slug === 'window-wipe') await expect(board.locator(':scope > span')).toHaveCount(60)
    for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport)
      await expect(board.locator('.keyboard-play-help')).toBeInViewport({ ratio: 1 })
      expect((await board.locator('.keyboard-play-help').boundingBox())!.width).toBeGreaterThan(200)
      await page.screenshot({ path: test.info().outputPath(`keyboard-${slug}-${viewport.width}.png`) })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true)
    }
    await page.getByRole('button', { name: 'Pause', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Round paused' })).toBeFocused()
    const before = await scores.allTextContents()
    await page.clock.runFor(10000)
    expect(await scores.allTextContents()).toEqual(before)
    await page.getByRole('button', { name: 'Resume round' }).click()
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeFocused()
    await page.clock.fastForward(65000)
    await expect(page.getByRole('dialog').getByRole('heading')).toBeFocused()
    await page.getByRole('button', { name: /Play again|Wipe again/ }).click()
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeFocused()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
}
