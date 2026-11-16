import { expect, openApp, test } from './fixtures'

// Headless macOS needs software WebGL for MediaPipe image preprocessing,
// even though inference itself uses its CPU delegate.
test.use({launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}})

test('distance guidance and opt-in local tracking keep the camera active and stop before play',async({page,installMockCamera})=>{
  test.setTimeout(60000)
  const requests:{url:string;method:string}[]=[]
  page.on('request',request=>requests.push({url:request.url(),method:request.method()}))
  await installMockCamera()
  await openApp(page)
  await expect(page.getByText('Start about 2–3 m (6–10 ft) from the camera.')).toBeVisible()
  expect(requests.some(r=>r.url.includes('/pose/'))).toBe(false)
  await page.getByRole('button',{name:'Test body tracking',exact:true}).click()
  // Real local model on the fixture's solid frame: no invented body skeleton.
  await expect(page.locator('.body-test__status')).not.toContainText('Loading body tracking',{timeout:40000})
  await expect(page.locator('.body-test__status')).toContainText('No body found')
  await expect(page.locator('.body-test polyline')).toHaveCount(0)
  expect(requests.some(r=>r.url.endsWith('.wasm'))).toBe(true)
  expect(requests.some(r=>r.url.endsWith('.task'))).toBe(true)
  expect(requests.every(r=>r.method==='GET'&&new URL(r.url).origin==='http://motion-play.test')).toBe(true)
  await page.getByRole('button',{name:'Hide body tracking',exact:true}).click()
  await expect(page.locator('iframe[title="Local body tracking runtime"]')).toHaveCount(0)
  await page.getByRole('button',{name:'Play Bubble Battle',exact:true}).click()
  await expect(page.locator('.camera-distance-cue')).toBeVisible()
  await expect(page.locator('.body-test')).toHaveCount(0)
  await expect(page.getByLabel('Mirrored live camera during gameplay')).toBeVisible()
  const state=await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number;stoppedTracks:number}}).__mockMediaState)
  expect(state.requests).toBe(1);expect(state.stoppedTracks).toBe(0)
})

test('changing player count keeps fit guidance and active test within the camera frame',async({page,installMockCamera})=>{
  await installMockCamera({person:true});await openApp(page)
  await page.getByRole('button',{name:'4 players',exact:true}).click()
  await expect(page.getByText('Stand side by side. Step back until everyone’s outstretched arms fit.')).toBeVisible()
  for(const size of [{width:1280,height:720},{width:390,height:844}]){
    await page.setViewportSize(size)
    await expect(page.getByRole('button',{name:'Test body tracking',exact:true})).toBeVisible()
    const guide=(await page.locator('.camera-lobby__guidance').boundingBox())!
    const actions=(await page.locator('.camera-lobby__actions').boundingBox())!
    expect(guide.y+guide.height).toBeLessThan(actions.y)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true)
    await page.screenshot({path:test.info().outputPath(`distance-guide-${size.width}.png`)})
  }
})
