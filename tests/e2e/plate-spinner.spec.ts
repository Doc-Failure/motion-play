import { isGameVisible } from '../../src/app/catalog'
import { expect, openApp, test } from './fixtures'

test.skip(!isGameVisible('plate-spinner'), 'Hidden while individual games are refined.')

test('Plate Spinner supports four-player rescue, drops, pause, results, replay and narrow layout', async ({ page, installMockCamera }) => {
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')})
  await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'))
  await installMockCamera()
  await openApp(page, '#/catalog')
  await page.getByRole('link', { name: 'Play Plate Spinner' }).click()
  await page.getByRole('button', { name: '4 players' }).click()
  await page.getByRole('button', { name: 'Play Plate Spinner' }).click()
  await expect(page.getByRole('heading', { name: 'Plate Spinner' })).toBeVisible()
  await page.clock.runFor(5300)
  await page.getByRole('button', { name: 'Spin Player 1 plate 1', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status', { name: 'Player 1 spin feedback' })).toContainText('rescued')
  await expect(page.getByRole('region', { name: 'Player 1', exact: true })).toContainText('10 points · 0 drops')
  await expect(page.getByRole('region', { name: 'Player 2', exact: true })).toContainText('0 points · 0 drops')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const spin = await page.getByLabel('Player 1 plate 1 spin').getAttribute('value')
  await page.clock.runFor(10000)
  await expect(page.getByLabel('Player 1 plate 1 spin')).toHaveAttribute('value', spin!)
  await expect(page.getByRole('heading', { name: 'Spinning paused' })).toBeFocused()
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeFocused()
  await page.screenshot({ path: test.info().outputPath('plate-four-players.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  for (const board of await page.locator('.plate-board').all()) {
    const bounds = (await board.boundingBox())!
    for (const button of await board.getByRole('button').all()) {
      const target = (await button.boundingBox())!
      expect(target.width).toBeGreaterThanOrEqual(24)
      expect(target.height).toBeGreaterThanOrEqual(24)
      expect(target.x).toBeGreaterThanOrEqual(bounds.x)
      expect(target.x + target.width).toBeLessThanOrEqual(bounds.x + bounds.width)
      expect(await button.locator('span').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
      const label = (await button.locator('span').boundingBox())!
      expect(label.y + label.height).toBeLessThanOrEqual(bounds.y + bounds.height)
    }
  }
  await page.screenshot({ path: test.info().outputPath('plate-narrow.png'), fullPage: true })
  await page.clock.runFor(3800)
  await expect(page.getByRole('region', { name: 'Player 2', exact: true })).toContainText('-5 points · 1 drops')
  await expect(page.getByRole('button', { name: 'Spin Player 2 plate 1', exact: true })).toBeDisabled()
  await page.clock.runFor(1500)
  await expect(page.getByRole('button', { name: 'Spin Player 2 plate 1', exact: true })).toBeEnabled()
  await page.clock.fastForward(60000)
  await expect(page.getByRole('dialog', { name: 'Plate Spinner results' })).toContainText('Player 1 wins!')
  await page.getByRole('button', { name: 'Play again' }).click()
  await expect(page.getByText('0 points · 0 drops', { exact: true })).toHaveCount(4)
  await page.getByRole('button', { name: 'Exit game' }).click()
  await expect(page.getByRole('button', { name: 'Play Plate Spinner' })).toBeEnabled()
})
