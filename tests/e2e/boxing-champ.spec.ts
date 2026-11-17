import {hideAndRestoreTab} from './fixtures'
import {completeReadyGate,expect,openApp,test} from './fixtures'
test('measured wrist motion punches the boxer, stationary wrists stop scoring, replay retains camera',async({page,installMockCamera})=>{
 test.setTimeout(60000)
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await installMockCamera({person:true})
 await openApp(page,'#/camera/punch-arena',async()=>{
  await page.route('**/pose/tracker.js',route=>route.fulfill({contentType:'text/javascript',body:`
   window.createLocalPoseTracker=async(players)=>({detect:()=>Array.from({length:players},(_,i)=>{
    const x=1-(i+.5)/players,p=Array.from({length:33},()=>({x,y:.5,visibility:1,presence:1}));
    for(const j of [0,2,5,7,8])p[j]={x,y:.25,visibility:1};
    p[11]={x:x-.06/players,y:.35,visibility:1};p[12]={x:x+.06/players,y:.35,visibility:1};
    p[23]={x:x-.05/players,y:.7,visibility:1};p[24]={x:x+.05/players,y:.7,visibility:1};
    let wx=.5,wy=.68;
    if(!parent.document.querySelector('.player-ready-gate')){wx=parent.__boxPunch?.5+Math.sin(performance.now()/120)*.2:.4;wy=.35}
    for(const j of [15,17,19,21])p[j]={x:1-(i+wx)/players,y:wy,visibility:1};p[16]={x,y:.8,visibility:.1};return p;
   }),close:()=>{}})
  `}))
 })
 await page.getByRole('button',{name:'1 player',exact:true}).click()
 await expect(page.getByLabel('Cardboard Champ movement demonstration')).toBeVisible()
 await expect(page.getByLabel('Players ready check',{exact:true})).toHaveCount(0,{timeout:15000})
 await expect(page.locator('.boxing-game')).toHaveAttribute('data-phase','playing',{timeout:6000})
 await expect(page.locator('.boxing-game header dd').first()).toHaveText('0')
 await page.evaluate(()=>Object.assign(window,{__boxPunch:true}))
 await expect.poll(async()=>Number(await page.locator('.boxing-game header dd').first().textContent()),{timeout:8000}).toBeGreaterThan(0)
 await page.screenshot({path:test.info().outputPath('boxing-hit.png')})
 await page.evaluate(()=>Object.assign(window,{__boxPunch:false}))
 await page.waitForTimeout(400)
 const score=await page.locator('.boxing-game header dd').first().textContent()
 await page.waitForTimeout(700)
 await expect(page.locator('.boxing-game header dd').first()).toHaveText(score!)
 await hideAndRestoreTab(page)
 await expect(page.getByRole('dialog',{name:'Cardboard Champ paused'})).toBeVisible()
 await page.getByRole('button',{name:'Resume round'}).click()
 await page.clock.install();await page.clock.fastForward(65000)
 await expect(page.getByRole('dialog',{name:'Cardboard Champ results'})).toBeVisible()
 await page.getByRole('button',{name:'Play again',exact:true}).click()
 await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number;stoppedTracks:number}}).__mockMediaState)).toMatchObject({requests:1,stoppedTracks:0})
 expect(errors).toEqual([])
})


test('four boxing lanes stay on the camera with reduced motion and independent keyboard scoring',async({page,installMockCamera})=>{
 await page.emulateMedia({reducedMotion:'reduce'})
 await installMockCamera({person:true})
 await openApp(page,'#/camera/punch-arena',async()=>{
  await page.route('**/pose/tracker.js',route=>route.fulfill({contentType:'text/javascript',body:'window.createLocalPoseTracker=async()=>({detect:()=>[],close:()=>{}})'}))
 })
 await page.getByRole('button',{name:'4 players',exact:true}).click()
 await completeReadyGate(page)
 await expect(page.locator('.boxing-game')).toHaveAttribute('data-phase','playing',{timeout:5000})
 const lane=page.getByRole('group',{name:'Player 3 Cardboard Champ play area'})
 await lane.focus();await page.keyboard.press('Space')
 await expect(page.locator('.boxing-game header dd').nth(2)).toHaveText('10')
 await expect(page.locator('.boxing-game header dd').nth(0)).toHaveText('0')
 await expect(page.locator('.boxing-game canvas')).toHaveCount(4)
 const bounds=await page.locator('.boxing-game canvas').evaluateAll(elements=>elements.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}))
 for(let i=1;i<4;i++)expect(bounds[i].x).toBeCloseTo(bounds[i-1].x+bounds[i-1].width,0)
 expect(bounds[0].y).toBeGreaterThanOrEqual(0)
 expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true)
 await page.screenshot({path:test.info().outputPath('boxing-four-players.png')})
})
