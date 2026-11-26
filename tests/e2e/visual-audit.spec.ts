import {completeReadyGate, expect, openApp, test} from './fixtures'
import {visibleCatalogGames} from '../../src/app/catalog'

for(const game of ['marble-bowling','shadow-snap','ninja-training'])test(`${game} tutorial uses a white card and video`,async({page,installMockCamera})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await installMockCamera({person:true})
 await openApp(page,`#/camera/${game}`,async()=>{await page.route('**/pose/tracker.js',r=>r.fulfill({contentType:'text/javascript',body:'window.createLocalPoseTracker=async()=>({detect:()=>[],close:()=>{}})'}))})
 await page.getByRole('button',{name:'1 player',exact:true}).click()
 await expect(page.locator('.player-ready-gate svg path').first()).toHaveAttribute('fill','#ffffff')
 const demo=page.locator('.game-intro-demo'),video=demo.locator('video')
 await expect(demo).toHaveCSS('background-color','rgb(255, 255, 255)')
 await expect.poll(()=>video.evaluate(el=>{
  const v=el as HTMLVideoElement;if(v.readyState<2)return false
  const c=document.createElement('canvas');c.width=320;c.height=180;const ctx=c.getContext('2d')!;ctx.drawImage(v,0,0,320,180)
  return Array.from(ctx.getImageData(2,2,1,1).data).slice(0,3).every(value=>value>=245)
 }),{timeout:10000}).toBe(true)
 await page.screenshot({path:test.info().outputPath(`${game}-white-tutorial.png`)})
})

test('tutorial and results use white neutral panels',async({page,installMockCamera})=>{
 await page.emulateMedia({reducedMotion:'reduce'})
 await installMockCamera({person:true})
 await openApp(page,'#/camera/ufo-juggler',async()=>{await page.route('**/pose/tracker.js',r=>r.fulfill({contentType:'text/javascript',body:'window.createLocalPoseTracker=async()=>({detect:()=>[],close:()=>{}})'}))})
 await page.getByRole('button',{name:'1 player',exact:true}).click()
 const demo=page.locator('.game-intro-demo'),video=demo.locator('video')
 await expect(demo).toHaveCSS('background-color','rgb(255, 255, 255)')
 await expect.poll(()=>video.evaluate(el=>{
  const v=el as HTMLVideoElement;if(v.readyState<2)return null
  const c=document.createElement('canvas');c.width=320;c.height=180;const ctx=c.getContext('2d')!;ctx.drawImage(v,0,0,320,180)
  return Array.from(ctx.getImageData(2,2,1,1).data).slice(0,3).every(value=>value>=245)
 }),{timeout:10000}).toBe(true)
 await page.screenshot({path:test.info().outputPath('white-tutorial.png')})
 await completeReadyGate(page)
 const baseline=await page.evaluate(()=>performance.now());await page.clock.install();await page.clock.fastForward(baseline+90000)
 const results=page.getByRole('dialog',{name:'UFO Juggler results'})
 await expect(results).toBeVisible();await page.clock.runFor(400)
 await expect(results).toHaveCSS('background-color','rgb(255, 255, 255)')
 await page.screenshot({path:test.info().outputPath('white-results.png')})
})

test('boxing instructions and controls stay separate and clear on results',async({page,installMockCamera})=>{
 await installMockCamera({person:true})
 await openApp(page,'#/camera/punch-arena',async()=>{await page.route('**/pose/tracker.js',r=>r.fulfill({contentType:'text/javascript',body:'window.createLocalPoseTracker=async()=>({detect:()=>[],close:()=>{}})'}))})
 await page.getByRole('button',{name:'1 player',exact:true}).click();await completeReadyGate(page)
 await expect(page.locator('.boxing-game')).toHaveAttribute('data-phase','playing',{timeout:6000})
 for(const viewport of [{width:1280,height:720},{width:390,height:844}]){
  await page.setViewportSize(viewport)
  const a=await page.locator('.boxing-game > [role="status"]').boundingBox(),b=await page.locator('.boxing-game > .game-tools').boundingBox()
  expect(a&&b&&(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y),JSON.stringify({a,b})).toBeTruthy()
 }
 await page.setViewportSize({width:1280,height:720})
 const baseline=await page.evaluate(()=>performance.now());await page.clock.install();await page.clock.fastForward(baseline+50000)
 await expect(page.getByRole('dialog',{name:'Cardboard Champ results'})).toBeVisible()
 await expect(page.locator('.boxing-game > .game-tools')).toBeHidden()
 await expect(page.locator('.boxing-game > [role="status"]')).toBeHidden()
 await page.clock.runFor(400)
 await page.screenshot({path:test.info().outputPath('boxing-results-clear.png')})
})

test('player selection and camera-opening status stay readable', async ({page}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{
      getUserMedia:()=>new Promise(()=>{}), enumerateDevices:async()=>[]
    }})
  })
  await openApp(page,'#/camera/window-wipe')
  const choice=page.getByRole('button',{name:'1 player',exact:true})
  await expect(choice).toBeVisible()
  const label=choice.locator('span')
  expect(await label.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(12)
  await expect(label).toHaveCSS('background-color','rgb(255, 255, 255)')
  const opening=page.getByRole('button',{name:'Opening camera…'})
  await expect(opening).toBeDisabled()
  await expect(opening).toHaveCSS('opacity','1')
  await page.screenshot({path:test.info().outputPath('home-opening-after.png')})
})

for (const game of visibleCatalogGames) {
  test(`visual audit: ${game.title}`, async ({page, installMockCamera}) => {
    test.setTimeout(40000)
    await installMockCamera({person:true})
    await openApp(page, `#/camera/${game.slug}`, async () => {
      await page.route('**/pose/tracker.js', route => route.fulfill({contentType:'text/javascript', body:'window.createLocalPoseTracker=async()=>({detect:()=>[],close:()=>{}})'}))
    })
    await page.getByRole('button',{name:'1 player',exact:true}).click()
    await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
    await page.screenshot({path:test.info().outputPath(`${game.slug}-intro.png`)})
    await completeReadyGate(page)
    await page.waitForTimeout(5000)
    await expect(page.getByRole('heading',{name:game.title,exact:true})).toBeVisible()
    await page.screenshot({path:test.info().outputPath(`${game.slug}-game.png`)})
    const baseline=await page.evaluate(()=>performance.now())
    await page.clock.install()
    await page.clock.fastForward(baseline+90000)
    const results=page.getByRole('dialog',{name:/results/i})
    await expect(results).toBeVisible()
    await page.clock.runFor(400)
    if(game.slug==='ninja-training')await expect(results.getByRole('heading',{name:'Training round complete!'})).toBeVisible()
    await page.screenshot({path:test.info().outputPath(`${game.slug}-results.png`)})
    await expect(results.getByRole('button',{name:game.slug==='window-wipe'?'Wipe again':'Play again',exact:true})).toBeVisible()
    await expect(results.getByRole('button',{name:'Back to games',exact:true})).toBeVisible()
  })
}

for (const slug of ['ninja-training','window-wipe']) {
  test(`narrow cue stays readable and clear of sound control: ${slug}`, async ({page, installMockCamera}) => {
    test.setTimeout(40000)
    await page.setViewportSize({width:390,height:844})
    await installMockCamera({person:true})
    await openApp(page, `#/camera/${slug}`, async () => {
      await page.route('**/pose/tracker.js', route => route.fulfill({contentType:'text/javascript', body:'window.createLocalPoseTracker=async()=>({detect:()=>[],close:()=>{}})'}))
    })
    await page.getByRole('button',{name:'1 player',exact:true}).click()
    await completeReadyGate(page)
    await page.waitForTimeout(3300)
    const cue=page.locator(slug==='ninja-training'?'.dojo-wave':'.wipe-cue')
    await expect(cue).toBeVisible()
    expect(await cue.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(12)
    const a=await cue.boundingBox(), b=await page.getByRole('button',{name:'Mute game sound'}).boundingBox()
    expect(a && b && (a.x+a.width<=b.x || b.x+b.width<=a.x || a.y+a.height<=b.y || b.y+b.height<=a.y), JSON.stringify({cue:a,sound:b})).toBeTruthy()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  })
}
