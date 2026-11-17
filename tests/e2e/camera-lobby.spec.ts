import { completeReadyGate, expect, openApp, test } from './fixtures'

test('minimal game introduction stays centered and visible without scrolling',async ({page,installMockCamera}) => {
  await installMockCamera({person:true});await openApp(page)
  await page.getByRole('button',{name:'4 players',exact:true}).click()
  const video=page.getByLabel('Mirrored live camera during gameplay')
  await expect.poll(()=>video.evaluate(v=>(v as HTMLVideoElement).videoWidth)).toBe(320)
  for(const viewport of [{width:1280,height:720},{width:1440,height:900},{width:390,height:844}]){
    await page.setViewportSize(viewport)
    await expect.poll(async()=>{const r=(await video.boundingBox())!;return Math.abs(r.x+r.width/2-viewport.width/2)+Math.abs(r.y+r.height/2-viewport.height/2)}).toBeLessThan(2)
    const r=(await video.boundingBox())!;expect(r.width/r.height).toBeCloseTo(4/3)
    await expect(page.getByLabel('Paper Dojo movement demonstration')).toBeVisible()
    await expect(page.getByRole('button',{name:/^Ready Player /})).toHaveCount(4)
    await expect(page.locator('.camera-lobby__players')).toBeHidden()
    await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeHidden()
    expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    await page.screenshot({path:test.info().outputPath(`game-intro-${viewport.width}.png`)})
  }
  await completeReadyGate(page)
  await page.getByRole('button',{name:'Exit game'}).click()
  await expect(page.getByRole('heading',{name:'Game Catalog',level:1})).toBeVisible()
  expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number}}).__mockMediaState.requests)).toBe(1)
})
