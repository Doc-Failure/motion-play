import { completeReadyGate, expect, openApp, test } from './fixtures'
import { visibleCatalogGames } from '../../src/app/catalog'

test('home displays the full domain at desktop and mobile sizes',async({page,installMockCamera})=>{
 await installMockCamera({denied:true});await openApp(page,'#/')
 const title=page.getByRole('heading',{name:'playpop.party'})
 await expect(title).toHaveText('playpop.party')
 for(const viewport of [{width:1280,height:720},{width:320,height:640}]){
  await page.setViewportSize(viewport)
  const box=(await title.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x+box.width).toBeLessThanOrEqual(viewport.width)
 }
 await page.setViewportSize({width:1280,height:720})
 await page.screenshot({path:test.info().outputPath('home-refreshed.png')})
 await page.getByRole('link',{name:'Game Catalog'}).click()
 await expect(page.locator('.catalog-tournament')).toHaveCount(0)
 await expect(page.locator('.catalog-picker .game-card').first()).toHaveCSS('background-image',/catalog-yellow\.webp/)
 await page.screenshot({path:test.info().outputPath('catalog-refreshed.png')})
})

test('keyboard skip link preserves catalog and active camera routes', async ({ page, installMockCamera }) => {
  await installMockCamera({ person: true })
  await openApp(page, '#/catalog')
  const skip = page.getByRole('link', { name: 'Skip to main content' })
  await skip.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
  await expect(page).toHaveURL(/#\/catalog$/)
  await expect(page.getByRole('heading', { name: 'Game Catalog', exact: true })).toHaveClass('sr-only')
  await page.getByRole('link', { name: 'Play Paper Dojo', exact: true }).click()
  await page.getByRole('button',{name:'1 player',exact:true}).click()
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
  const games = visibleCatalogGames.filter(game => game.available)
  await expect(page.locator('.catalog-picker .game-doodle')).toHaveCount(visibleCatalogGames.length)
  expect(games.map(game => game.slug)).toContain('marble-bowling')
  await expect(page.getByRole('link',{name:'Play Paper Jam',exact:true})).toHaveCount(0)
  await expect(page.getByRole('link',{name:'Play Rocket Rumble',exact:true})).toHaveCount(0)
  await expect(page.getByRole('link',{name:'Play Bubble Battle',exact:true})).toHaveCount(0)
  await expect(page.getByRole('heading',{name:'Game Catalog',exact:true})).toHaveClass('sr-only')
  await expect(page.locator('.catalog-tournament')).toHaveCount(0)
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
  await page.getByRole('button',{name:'1 player',exact:true}).click()
  await completeReadyGate(page)
  await expect(page.locator('.camera-play')).toHaveAttribute('data-flow','playing')
  await expect(page.getByRole('button',{name:'Start round now'})).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByLabel('Player 1 Window Wipe play area')).toBeVisible()
})

test('old deferred game links return to the focused catalog',async ({page}) => {
  await openApp(page,'#/camera/meteor-smash')
  await expect(page.getByRole('heading',{name:'Game Catalog',exact:true})).toHaveClass('sr-only')
  await expect(page.locator('.game-card')).toHaveCount(visibleCatalogGames.length)
  await expect(page.getByRole('link',{name:'Play Meteor Smash',exact:true})).toHaveCount(0)
})

test('enabling the camera preserves the catalog layout and tab order', async ({page,browserName,installMockCamera}) => {
  const viewports = [{width: 1440, height: 900}, {width: 390, height: 844}]
  await installMockCamera({denied:true,person:true})
  await openApp(page, '#/catalog')
  const enable = page.getByRole('button',{name:'Enable webcam navigation'})
  await expect(enable).toBeEnabled()
  const catalog = page.getByRole('region',{name:'Game Catalog'})
  await page.mouse.move(0,0)
  await page.evaluate(()=>document.fonts.ready)

  async function positions() {
    return catalog.evaluate(board => {
      const frame = board.getBoundingClientRect()
      return [...board.querySelectorAll('a')].map(link => {
        const rect = link.getBoundingClientRect()
        const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2
        return {
          href:link.hash,
          x:100 * (x - frame.left) / frame.width,
          y:100 * (y - frame.top) / frame.height,
          reachable:link.contains(document.elementFromPoint(x,y))
        }
      })
    })
  }

  const before: Awaited<ReturnType<typeof positions>>[] = []
  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    const links = await positions()
    expect(links.map(link=>link.href)).toEqual(['#/', ...visibleCatalogGames.map(game=>'#/camera/'+game.slug)])
    const cards = links.slice(1)
    expect(cards.every(link=>link.reachable)).toBe(true)
    for(const [i,card] of cards.entries()){
      const col=i%4, rowStart=i-col
      expect(Math.abs(card.x-cards[col].x)).toBeLessThan(1)
      expect(Math.abs(card.y-cards[rowStart].y)).toBeLessThan(1)
      if(col>0) expect(card.x-cards[i-1].x).toBeGreaterThan(15)
      if(i>=4) expect(card.y-cards[i-4].y).toBeGreaterThan(15)
    }
    before.push(links)
    await page.screenshot({path:test.info().outputPath('catalog-camera-free-'+viewport.width+'.png')})
  }

  const back = catalog.getByRole('link',{name:'Back to Home'})
  await back.focus()
  for (const game of visibleCatalogGames) {
    // WebKit uses Option-Tab to include links in its default macOS focus cycle.
    await page.keyboard.press(browserName==='webkit' && process.platform==='darwin' ? 'Alt+Tab' : 'Tab')
    await expect(catalog.getByRole('link',{name:'Play '+game.title,exact:true})).toBeFocused()
  }
  await page.evaluate(()=>{
    const {__cameraFixture:canvas}=window as typeof window & {__cameraFixture:HTMLCanvasElement}
    navigator.mediaDevices.getUserMedia=async()=>canvas.captureStream(20)
  })
  await enable.click()
  await expect(page.locator('body')).toHaveClass(/camera-menu-active/)
  for (const [index,viewport] of viewports.entries()) {
    await page.setViewportSize(viewport)
    await expect.poll(async()=>(await positions()).every((link,i)=>{
      const previous=before[index][i]
      return link.href===previous.href && link.reachable &&
        Math.abs(link.x-previous.x)<1 && Math.abs(link.y-previous.y)<1
    })).toBe(true)
  }
  await catalog.getByRole('link',{name:'Play Shadow Snap'}).press('Enter')
  await page.getByRole('button',{name:'1 player',exact:true}).click()
  await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
})
