import { expect, openApp, test } from './fixtures'

for (const route of ['camera/jump-rush', 'games/jump-rush']) {
  test(`keeps ${route} gated during public refinement`, async ({ page }) => {
    await openApp(page, `#/${route}`)
    await expect(page.getByRole('heading', { name: 'Game Catalog', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Play Jump Rush', exact: true })).toHaveCount(0)
    await expect(page.locator('.camera-play')).toHaveCount(0)
  })
}
