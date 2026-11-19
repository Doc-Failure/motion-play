import { expect, openApp, test } from './fixtures'

for (const route of ['camera/dodgeball', 'games/dodgeball']) {
  test(`keeps ${route} gated during public refinement`, async ({ page }) => {
    await openApp(page, `#/${route}`)
    await page.getByRole('button',{name:'1 player',exact:true}).click()
    await expect(page.getByRole('heading', { name: 'Game Catalog', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Play Dodgeball', exact: true })).toHaveCount(0)
    await expect(page.locator('.camera-play')).toHaveCount(0)
  })
}
