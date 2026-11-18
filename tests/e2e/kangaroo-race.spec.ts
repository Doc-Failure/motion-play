import {test,expect,openApp,completeReadyGate,hideAndRestoreTab} from './fixtures'
for(const players of [1,4] as const)test(`Kangaroo Race ${players} players: body jumps, distance and replay`,async({page,installMockCamera})=>{
 test.setTimeout(45000);await installMockCamera({person:true})
 await openApp(page,'#/camera/kangaroo-race',async()=>{await page.route('**/pose/tracker.js',r=>r.fulfill({contentType:'text/javascript',body:`window.createLocalPoseTracker=async()=>({detect:()=>{
 const el=parent.document.querySelector('.race-track'),racers=JSON.parse(el?.dataset.racers||'[]');return Array.from({length:${players}},(_,i)=>{
 const r=racers[i],remaining=r?(r.next-r.distance)/10:9,rise=i===0&&remaining<.28&&remaining>0?.09:0,x=1-(i+.5)/${players};const p=Array.from({length:33},()=>({x,y:.5,visibility:0,presence:1}));for(const [id,dx,y]of [[0,0,.25],[7,-.01,.25],[8,.01,.25],[11,-.03,.4],[12,.03,.4],[23,-.025,.65],[24,.025,.65]])p[id]={x:x+dx,y:y-rise,visibility:1,presence:1};return p;});},close:()=>{}})`}))})
 await page.getByRole('button',{name:players===1?'1 player':'4 players',exact:true}).click();await expect(page.getByLabel('Kangaroo Race movement demonstration')).toBeVisible();await completeReadyGate(page)
 await expect(page.locator('.race-game')).toHaveAttribute('data-phase','playing',{timeout:6000})
 await expect.poll(async()=>JSON.parse((await page.locator('.race-track').getAttribute('data-racers'))!)[0].cleared,{timeout:7000}).toBeGreaterThan(0)
 await expect(page.getByRole('img',{name:'Your kangaroo, Player 1'})).toBeVisible()
 await page.screenshot({path:test.info().outputPath(`race-${players}.png`)})
 expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true)
 await hideAndRestoreTab(page);const frozen=await page.locator('.race-track').getAttribute('data-racers');await page.waitForTimeout(150);expect(await page.locator('.race-track').getAttribute('data-racers')).toBe(frozen);await page.getByRole('button',{name:'Resume round'}).click()
 const baseline=await page.evaluate(()=>performance.now());await page.clock.install();await page.clock.fastForward(baseline+50000)
 await expect(page.getByRole('dialog',{name:'Kangaroo Race results'})).toBeVisible();await expect(page.locator('.result-actions button')).toHaveCount(2)
 await page.getByRole('button',{name:'Play again',exact:true}).click();await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number;stoppedTracks:number}}).__mockMediaState)).toMatchObject({requests:1,stoppedTracks:0})
})
