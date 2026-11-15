import { expect, openApp, test } from './fixtures'

for (const route of ['camera/tower-builder', 'games/tower-builder']) {
  test(`keeps ${route} gated during public refinement`, async ({ page }) => {
    await openApp(page, `#/${route}`)
    await expect(page.getByRole('heading', { name: 'Game Catalog', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Play Tower Builder', exact: true })).toHaveCount(0)
    await expect(page.locator('.camera-play')).toHaveCount(0)
  })
}
