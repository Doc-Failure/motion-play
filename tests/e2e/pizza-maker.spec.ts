import { expect, openApp, test } from './fixtures'

test('Pizza Maker routes starts directly and supports four-player input, pause, results and replay', async ({ page, installMockCamera }) => {
  await page.clock.install()
  await installMockCamera()
  await openApp(page, '#/catalog')
  await page.getByRole('link', { name: 'Play Pizza Maker' }).click()
  await page.getByRole('button', { name: '4 players' }).click()
  await page.getByRole('button', { name: 'Play Pizza Maker' }).click()
  await expect(page.getByRole('heading', { name: 'Pizza Maker' })).toBeVisible()
  await page.clock.runFor(3100)
  await page.getByRole('button', { name: 'Pick Player 1 tomato', exact: true }).click()
  await page.clock.runFor(350)
  await page.getByRole('button', { name: 'Pick Player 1 basil', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('region', { name: 'Player 1', exact: true })).toContainText('40 points · 1 pizzas')
  await page.getByRole('button', { name: 'Pick Player 2 mushroom', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Player 2 pick feedback' })).toContainText('not on this order')
  await expect(page.getByRole('region', { name: 'Player 3', exact: true })).toContainText('0 points · 0 pizzas')
  await expect(page.getByRole('region', { name: 'Player 4', exact: true })).toContainText('0 points · 0 pizzas')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.clock.runFor(10000)
  await expect(page.getByRole('heading', { name: 'Kitchen paused' })).toBeFocused()
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeFocused()
  await page.clock.runFor(1000)
  await expect(page.getByLabel('Player 1 order')).toContainText('mushroom + tomato')
  await expect(page.getByRole('status', { name: 'Player 1 pick feedback' })).toContainText('New order!')
  await page.screenshot({ path: test.info().outputPath('pizza-four-players.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  for (const board of await page.locator('.pizza-board').all()) {
    const bounds = (await board.boundingBox())!
    for (const button of await board.getByRole('button').all()) {
      const target = (await button.boundingBox())!
      expect(target.width).toBeGreaterThanOrEqual(24)
      expect(target.height).toBeGreaterThanOrEqual(24)
      expect(target.x).toBeGreaterThanOrEqual(bounds.x)
      expect(target.x + target.width).toBeLessThanOrEqual(bounds.x + bounds.width)
      expect(target.y + target.height).toBeLessThanOrEqual(bounds.y + bounds.height)
      const label = (await button.locator('span').boundingBox())!
      expect(label.y + label.height).toBeLessThanOrEqual(bounds.y + bounds.height)
      expect(await button.locator('span').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    }
  }
  await page.screenshot({ path: test.info().outputPath('pizza-narrow.png'), fullPage: true })
  await page.clock.fastForward(60000)
  await expect(page.getByRole('dialog', { name: 'Pizza Maker results' })).toContainText('Team pizzas: 1 / 12')
  await page.getByRole('button', { name: 'Play again' }).click()
  await expect(page.getByText('0 points · 0 pizzas', { exact: true })).toHaveCount(4)
  await page.getByRole('button', { name: 'Exit game' }).click()
  await expect(page.getByRole('button', { name: 'Play Pizza Maker' })).toBeEnabled()
})

test('Pizza Maker reaches its cooperative goal before timeout', async ({ page, installMockCamera }) => {
  await page.clock.install()
  await installMockCamera()
  await openApp(page, '#/camera/pizza-maker')
  await page.getByRole('button', { name: 'Play Pizza Maker' }).click()
  await page.clock.runFor(3100)
  for (const recipe of [['basil', 'tomato'], ['tomato', 'mushroom'], ['mushroom', 'basil']]) {
    for (const ingredient of recipe) {
      await page.getByRole('button', { name: `Pick Player 1 ${ingredient}`, exact: true }).click()
      await page.clock.runFor(350)
    }
    if (recipe[0] !== 'mushroom') await page.clock.runFor(900)
  }
  await expect(page.getByRole('heading', { name: 'Tasty teamwork!' })).toBeFocused()
  await expect(page.getByRole('dialog')).toContainText('Team pizzas: 3 / 3')
  await expect(page.getByRole('dialog')).toContainText('120 points')
})
