import { isGameVisible } from '../../src/app/catalog'
import { expect, openApp, test } from './fixtures'

test.skip(!isGameVisible('graffiti-race'), 'Hidden while individual games are refined.')

test('Graffiti Race routes from the catalog and isolates four-player painting with pause and replay', async ({ page, installMockCamera }) => {
  await page.clock.install()
  await installMockCamera()
  await openApp(page, '#/catalog')
  await page.getByRole('link', { name: 'Play Graffiti Race' }).click()
  await page.getByRole('button', { name: '4 players' }).click()
  await page.getByRole('button', { name: 'Play Graffiti Race' }).click()
  await expect(page.getByRole('heading', { name: 'Graffiti Race', exact: true })).toBeVisible()
  await page.clock.runFor(3100)
  await page.getByLabel('Player 1 Graffiti Race play area').focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('progressbar', { name: 'Player 1 mural progress' })).not.toHaveAttribute('value', '0')
  const board = page.getByLabel('Player 2 Graffiti Race play area')
  const bounds = (await board.boundingBox())!
  await page.mouse.move(bounds.x + bounds.width * .2, bounds.y + bounds.height * .2)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width * .8, bounds.y + bounds.height * .8, { steps: 16 })
  await page.mouse.up()
  await expect(page.getByRole('progressbar', { name: 'Player 2 mural progress' })).not.toHaveAttribute('value', '0')
  await expect(page.getByRole('progressbar', { name: 'Player 3 mural progress' })).toHaveAttribute('value', '0')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const time = await page.locator('.graffiti-game header dd').textContent()
  await page.clock.runFor(10000)
  await expect(page.locator('.graffiti-game header dd')).toHaveText(time!)
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeFocused()
  await page.screenshot({ path: 'test-results/graffiti-race-four-players.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/graffiti-race-narrow.png', fullPage: true })
  await page.clock.fastForward(60000)
  await expect(page.getByRole('dialog', { name: 'Graffiti Race results' })).toBeVisible()
  await page.getByRole('button', { name: 'Paint again' }).click()
  await expect(page.getByText('0% revealed · 0 patches', { exact: true })).toHaveCount(4)
  await page.getByRole('button', { name: 'Exit game' }).click()
  await expect(page.getByRole('button', { name: 'Play Graffiti Race' })).toBeEnabled()
})

test('Graffiti Race ends as soon as a player reveals their mural', async ({ page, installMockCamera }) => {
  test.setTimeout(60_000)
  await page.clock.install()
  await installMockCamera()
  await openApp(page, '#/camera/graffiti-race')
  await page.getByRole('button', { name: '2 players' }).click()
  await page.getByRole('button', { name: 'Play Graffiti Race' }).click()
  await page.clock.runFor(3100)
  const bounds = (await page.getByLabel('Player 2 Graffiti Race play area').boundingBox())!
  for (let row = 0; row < 8; row++) {
    const y = bounds.y + bounds.height * (row + .5) / 8
    await page.mouse.move(bounds.x + bounds.width * .02, y)
    await page.mouse.down()
    await page.mouse.move(bounds.x + bounds.width * .98, y, { steps: 24 })
    await page.mouse.up()
  }
  await expect(page.getByRole('dialog', { name: 'Graffiti Race results' })).toContainText('Player 2 wins!')
  await expect(page.getByRole('progressbar', { name: 'Player 2 mural progress' })).toHaveAttribute('value', '100')
  await expect(page.getByRole('progressbar', { name: 'Player 1 mural progress' })).toHaveAttribute('value', '0')
  await page.screenshot({ path: 'test-results/graffiti-race-complete.png', fullPage: true })
})
