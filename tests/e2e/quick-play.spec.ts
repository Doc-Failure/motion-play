import { expect, openApp, test } from './fixtures'
import { visibleCatalogGames } from '../../src/app/catalog'

test('home offers only two choices and Quick Play starts a random game',async ({page,installMockCamera}) => {
  await installMockCamera({person:true})
  await page.addInitScript(() => {Math.random = () => .5})
  await openApp(page,'#/')
  await expect(page.locator('.action-card')).toHaveCount(2)
  await expect(page.getByRole('link',{name:/Tournament/})).toHaveCount(0)
  await expect(page.locator('.home-callouts')).toHaveCount(0)
  await page.screenshot({path:test.info().outputPath('two-choice-home.png'),fullPage:true})
  await page.getByRole('link',{name:/Quick Play/}).click()
  const games = visibleCatalogGames.filter(game => game.available && [1,2,3,4].every(count => game.players.includes(count)))
  const chosen = games[Math.floor(games.length*.5)]
  await expect(page.locator('.camera-play')).toHaveAttribute('data-flow','playing')
  await expect(page.getByRole('heading',{name:chosen.title,exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:`Play ${chosen.title}`,exact:true})).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Start round now'})).toHaveCount(0)
  await page.getByRole('button',{name:'Exit game',exact:true}).click()
  await expect(page.getByRole('button',{name:`Play ${chosen.title}`,exact:true})).toBeVisible()
  expect(await page.evaluate(() => (window as typeof window & {__mockMediaState:{requests:number}}).__mockMediaState.requests)).toBe(1)
})
