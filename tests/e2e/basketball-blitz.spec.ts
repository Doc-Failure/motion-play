import { expect, openApp, test } from './fixtures'
for (const route of ['camera/basketball-blitz','games/basketball-blitz']) {
  test(`keeps ${route} hidden during public refinement`,async({page})=>{
    await openApp(page,`#/${route}`)
    await expect(page.getByRole('heading',{name:'Game Catalog',exact:true})).toBeVisible()
    await expect(page.getByRole('link',{name:'Play Basketball Blitz',exact:true})).toHaveCount(0)
    await expect(page.locator('.camera-play')).toHaveCount(0)
  })
}
