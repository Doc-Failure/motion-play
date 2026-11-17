import { completeReadyGate, expect, openApp, test } from './fixtures'
import { visibleCatalogGames } from '../../src/app/catalog'

test('keyboard skip link preserves catalog and active camera routes', async ({ page, installMockCamera }) => {
  await installMockCamera({ person: true })
  await openApp(page, '#/catalog')
  await page.getByRole('button',{name:'1 player',exact:true}).click()
  const skip = page.getByRole('link', { name: 'Skip to main content' })
  await skip.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
  await expect(page).toHaveURL(/#\/catalog$/)
  await expect(page.getByRole('heading', { name: 'Game Catalog', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Play Paper Dojo', exact: true }).click()
  await completeReadyGate(page)
  await expect(page.locator('.dojo-game')).toBeVisible()
  await skip.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
  await expect(page).toHaveURL(/#\/camera\/ninja-training$/)
  await expect(page.locator('.dojo-game')).toBeVisible()
  expect(await page.evaluate(() => (window as typeof window & {
    __mockMediaState: { requests: number; stoppedTracks: number }
  }).__mockMediaState)).toMatchObject({ requests: 1, stoppedTracks: 0 })
})

test('catalog uses compact homepage stickers and Play starts without confirmation',async ({page,installMockCamera}) => {
  await installMockCamera({person:true})
  await openApp(page,'#/catalog')
  await page.getByRole('button',{name:'1 player',exact:true}).click()
  const games = visibleCatalogGames.filter(game => game.available)
  await expect(page.locator('.catalog-picker .game-doodle')).toHaveCount(7)
  expect(games).toHaveLength(7)
  await expect(page.getByRole('link',{name:'Play Rocket Rumble',exact:true})).toHaveCount(0)
  await expect(page.getByRole('link',{name:'Play Bubble Battle',exact:true})).toHaveCount(0)
  await expect(page.locator('.catalog-toolbar')).toContainText('Game Catalog')
  await expect(page.getByRole('link',{name:'← Back to Home'})).toBeVisible()
  await expect(page.locator('.site-header')).toHaveCount(0)
  await expect(page.getByText('Pick a game and jump in.')).toHaveCount(0)
  await expect(page.locator('.catalog-picker .game-art__doodle')).toHaveCount(0)
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]) {
    await page.setViewportSize(viewport)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({path:test.info().outputPath(`catalog-${viewport.width}.png`),fullPage:true})
  }
  await page.setViewportSize({width:1280,height:720})
  await page.getByRole('link',{name:'Play Window Wipe',exact:true}).click()
  await completeReadyGate(page)
  await expect(page.locator('.camera-play')).toHaveAttribute('data-flow','playing')
  await expect(page.getByRole('button',{name:'Start round now'})).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByLabel('Player 1 Window Wipe play area')).toBeVisible()
})

test('old deferred game links return to the focused catalog',async ({page}) => {
  await openApp(page,'#/camera/meteor-smash')
  await page.getByRole('button',{name:'1 player',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Game Catalog',exact:true})).toBeVisible()
  await expect(page.locator('.game-card')).toHaveCount(7)
  await expect(page.getByRole('link',{name:'Play Meteor Smash',exact:true})).toHaveCount(0)
})
