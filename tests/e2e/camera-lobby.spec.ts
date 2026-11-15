import { expect, openApp, test } from './fixtures'

test('camera setup stays centered and entirely visible without scrolling',async ({page,installMockCamera}) => {
  await installMockCamera({person:true})
  await openApp(page)
  await expect(page.getByRole('button',{name:'Play Bubble Battle',exact:true})).toBeEnabled()
  const video = page.getByLabel('Mirrored camera preview')
  await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).videoWidth)).toBe(320)
  for(const viewport of [{width:1280,height:720},{width:1440,height:900},{width:390,height:844}]) {
    await page.setViewportSize(viewport)
    await expect.poll(async () => {
      const bounds = (await video.boundingBox())!
      return Math.abs(bounds.x+bounds.width/2-viewport.width/2)+Math.abs(bounds.y+bounds.height/2-viewport.height/2)
    }).toBeLessThan(2)
    const bounds = (await video.boundingBox())!
    expect(bounds.width/bounds.height).toBeCloseTo(4/3)
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.y).toBeGreaterThanOrEqual(0)
    expect(bounds.x+bounds.width).toBeLessThanOrEqual(viewport.width)
    expect(bounds.y+bounds.height).toBeLessThanOrEqual(viewport.height)
    for(const name of ['1 player','2 players','3 players','4 players','Play Bubble Battle']) {
      const button = page.getByRole('button',{name,exact:true})
      await expect(button).toBeVisible()
      const box = (await button.boundingBox())!
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.y+box.height).toBeLessThanOrEqual(viewport.height)
    }
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.locator('.site-header')).not.toBeVisible()
    await expect(page.getByRole('heading',{name:'Everybody ready?'})).toHaveCount(0)
    await page.screenshot({path:test.info().outputPath(`camera-lobby-${viewport.width}.png`)})
  }
  await page.getByRole('button',{name:'4 players',exact:true}).click()
  await page.getByRole('button',{name:'Play Bubble Battle',exact:true}).click()
  await expect(page.getByRole('button',{name:'Start round now'})).toHaveCount(0)
  await page.getByRole('button',{name:'Exit game'}).click()
  await expect(video).toBeVisible()
  expect(await page.evaluate(() => (window as typeof window & {__mockMediaState:{requests:number}}).__mockMediaState.requests)).toBe(1)
})
