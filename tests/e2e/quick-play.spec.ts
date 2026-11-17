import { expect, openApp, test } from './fixtures'

test('home asks once, then offers only catalog and three-game tournament', async ({page,installMockCamera}) => {
  await installMockCamera({person:true});await openApp(page,'#/')
  await expect(page.getByRole('heading',{name:'How many players?'})).toBeVisible()
  await page.getByRole('button',{name:'2 players',exact:true}).click()
  await expect(page.locator('.action-card')).toHaveCount(2)
  await expect(page.getByRole('link',{name:/Quick Play/})).toHaveCount(0)
  await page.getByRole('link',{name:/Game Catalog/}).click()
  await expect(page.getByRole('heading',{name:'Game Catalog',exact:true})).toBeVisible()
  await page.getByRole('link',{name:'← Back to Home'}).click()
  await page.getByRole('link',{name:/Tournament/}).click()
  await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:/^Ready Player /})).toHaveCount(2)
})

test('retired Quick Play URL opens catalog with automatic camera navigation', async ({page,installMockCamera}) => {
  await installMockCamera({person:true});await openApp(page,'#/quick-play')
  await page.getByRole('button',{name:'1 player',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Game Catalog',exact:true})).toBeVisible()
  await expect.poll(()=>page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number}}).__mockMediaState.requests)).toBe(1)
})
