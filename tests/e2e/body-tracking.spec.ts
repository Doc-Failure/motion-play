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
  await expect(page.getByRole('button',{name:'Hide body tracking',exact:true})).toHaveAttribute('aria-pressed','true')
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
    await expect(page.getByRole('button',{name:'Hide body tracking',exact:true})).toBeVisible()
    const guide=(await page.locator('.camera-lobby__guidance').boundingBox())!
    const actions=(await page.locator('.camera-lobby__actions').boundingBox())!
    expect(guide.y+guide.height).toBeLessThan(actions.y)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true)
    await page.screenshot({path:test.info().outputPath(`distance-guide-${size.width}.png`)})
  }
})

test('fixture joints stay aligned through setup and play, and wireframe can be toggled without restarting the camera',async({page,installMockCamera})=>{
  await installMockCamera({person:true})
  await openApp(page,'#/camera/rocket-rumble')
  // Deterministic detector fixture verifies UI geometry/lifecycle, not ML accuracy.
  await page.route('**/pose/tracker.js',route=>route.fulfill({contentType:'text/javascript',body:`window.createLocalPoseTracker=async()=>({detect:()=>{const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));p[11]={x:.3,y:.3,visibility:1};p[12]={x:.7,y:.3,visibility:1};p[23]={x:.4,y:.8,visibility:1};p[24]={x:.6,y:.8,visibility:1};return [p]},close:()=>{}})`}))
  await page.getByRole('button',{name:'Hide body tracking',exact:true}).click()
  await page.getByRole('button',{name:'Test body tracking',exact:true}).click()
  await expect(page.locator('.body-test polyline')).toHaveCount(5)
  await expect(page.locator('.body-test polyline').first()).toHaveAttribute('points','500,300 500,800')
  await page.getByRole('button',{name:'Play Rocket Rumble',exact:true}).click()
  await expect(page.getByRole('button',{name:'Hide wireframe',exact:true})).toHaveAttribute('aria-pressed','true')
  await expect(page.locator('.camera-play .body-test polyline')).toHaveCount(5)
  await expect(page.locator('.body-test polyline').first()).toHaveAttribute('points','500,300 500,800')
  await expect(page.locator('.body-test__status')).toContainText('Following your body')
  const overlay=(await page.locator('.body-test__sticks').boundingBox())!,video=(await page.getByLabel('Mirrored live camera during gameplay').boundingBox())!
  expect(overlay).toEqual(video)
  await page.waitForTimeout(3400)
  await expect(page.locator('.rocket-game header dd').first()).toHaveText('0')
  await page.screenshot({path:test.info().outputPath('game-wireframe.png')})
  await page.getByRole('button',{name:'Hide wireframe',exact:true}).click()
  await expect(page.locator('.body-test')).toHaveCount(0)
  await expect(page.locator('iframe[title="Local body tracking runtime"]')).toHaveCount(0)
  await page.getByRole('button',{name:'Show wireframe',exact:true}).click()
  await expect(page.locator('.body-test polyline')).toHaveCount(5)
  await page.getByRole('button',{name:'Exit game',exact:true}).click()
  await expect(page.getByRole('button',{name:'Hide body tracking',exact:true})).toHaveAttribute('aria-pressed','true')
  await expect(page.locator('.camera-lobby .body-test polyline')).toHaveCount(5)
  const state=await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number;stoppedTracks:number}}).__mockMediaState)
  expect(state.requests).toBe(1);expect(state.stoppedTracks).toBe(0)
})

test('raised-hand alignment checks framing and holds the round without restarting the camera',async({page,installMockCamera})=>{
  await installMockCamera({person:true});await openApp(page,'#/camera/rocket-rumble')
  await page.route('**/pose/tracker.js',route=>route.fulfill({contentType:'text/javascript',body:`window.createLocalPoseTracker=async()=>({detect:()=>{const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));p[0]={x:.5,y:.12,visibility:1};p[7]={x:.46,y:.12,visibility:1};p[8]={x:.54,y:.12,visibility:1};p[11]={x:.35,y:.3,visibility:1};p[12]={x:.65,y:.3,visibility:1};p[23]={x:.4,y:.7,visibility:1};p[24]={x:.6,y:.7,visibility:1};p[15]={x:.18,y:parent.__handsRaised ? 0.15 : 0.55,visibility:1};p[16]={x:.82,y:parent.__handsRaised ? 0.15 : 0.55,visibility:1};return [p]},close:()=>{}})`}))
  await page.getByRole('button',{name:'Hide body tracking',exact:true}).click();await page.getByRole('button',{name:'Test body tracking',exact:true}).click()
  await page.getByRole('button',{name:'Play Rocket Rumble',exact:true}).click();await page.waitForTimeout(3300)
  await page.getByRole('button',{name:'Align player',exact:true}).click()
  await expect(page.locator('.body-alignment')).toContainText('raise both hands')
  await expect(page.locator('.battle-results button').filter({hasText:'Resume round'})).toBeDisabled()
  const time=await page.locator('.rocket-game header dd').last().textContent()
  await page.screenshot({path:test.info().outputPath('alignment-guidance.png')})
  await page.evaluate(()=>Object.assign(window,{__handsRaised:true}))
  await expect(page.locator('.body-alignment')).toContainText('Ready!',{timeout:10000})
  await expect(page.getByRole('dialog',{name:'Rocket Rumble paused'})).toContainText('Alignment check ended')
  await expect(page.locator('.rocket-game header dd').last()).toHaveText(time!)
  await expect(page.locator('.rocket-game header dd').first()).toHaveText('0')
  await page.getByRole('button',{name:'Resume round',exact:true}).click()
  await expect(page.getByRole('dialog',{name:'Rocket Rumble paused'})).toHaveCount(0)
  await page.getByRole('button',{name:'Align player',exact:true}).click();await page.getByRole('button',{name:'Cancel alignment',exact:true}).click()
  await expect(page.getByRole('button',{name:'Resume round',exact:true})).toBeEnabled()
  const state=await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number;stoppedTracks:number}}).__mockMediaState)
  expect(state.requests).toBe(1);expect(state.stoppedTracks).toBe(0)
})
