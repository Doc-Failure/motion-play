import { expect, openApp, test } from './fixtures'

test('supplied UI artwork loads on home and catalog without changing camera setup',async ({page,installMockCamera}) => {
  await installMockCamera({person:true})
  await openApp(page,'#/')
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
    await page.setViewportSize(viewport)
    await page.locator('.reference-home img').evaluateAll(async images => {
      await Promise.all(images.map(image => (image as HTMLImageElement).decode()))
    })
    await expect(page.locator('.action-icon .ui-pack-icon')).toHaveCount(2)
    await expect(page.locator('.home-callouts .ui-pack-icon')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({path:test.info().outputPath(`home-pack-${viewport.width}.png`),fullPage:true})
  }
  await page.setViewportSize({width:1440,height:900})
  await page.getByRole('link',{name:/Game Catalog/}).click()
  await expect(page.getByRole('heading',{name:'The toy box'})).toBeVisible()
  await page.screenshot({path:test.info().outputPath('catalog-pack.png'),fullPage:true})
  await page.getByRole('link',{name:'Play Bubble Battle',exact:true}).click()
  const play = page.getByRole('button',{name:'Play Bubble Battle',exact:true})
  await expect(play).toBeEnabled()
  await expect(play.locator('.ui-pack-icon')).toBeVisible()
  const preview = (await page.getByLabel('Mirrored camera preview').boundingBox())!
  expect(preview.x+preview.width/2).toBeCloseTo(720)
  expect(preview.y+preview.height/2).toBeCloseTo(450)
  await page.screenshot({path:test.info().outputPath('camera-pack.png')})
  await play.click()
  await expect(page.locator('.camera-play')).toHaveAttribute('data-flow','playing')
  await expect(page.getByRole('button',{name:'Start round now'})).toHaveCount(0)
})
