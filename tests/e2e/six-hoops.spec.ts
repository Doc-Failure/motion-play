import {test,expect,openApp,completeReadyGate,hideAndRestoreTab} from './fixtures'
for(const players of [1,4] as const)test(`Six Hoops ${players} players: body deflection, basket, recovery and replay`,async({page,installMockCamera})=>{
 test.setTimeout(45000)
 await installMockCamera({person:true})
 await openApp(page,'#/camera/six-hoops',async()=>{
  await page.route('**/pose/tracker.js',r=>r.fulfill({contentType:'text/javascript',body:`window.createLocalPoseTracker=async()=>({detect:()=>{
   const canvas=parent.document.querySelector('.hoops-game canvas');if(!canvas)return [];
   const balls=JSON.parse(canvas.dataset.balls||'[]'),b=balls.find(b=>b.state==='falling'&&!b.owner&&b.y>.4&&b.y<.55);if(!b)return [];
   const x=1-(b.x+(b.x<.5?.015:-.015)),y=b.y+.045,p=Array.from({length:33},()=>({x,y,visibility:0,presence:1}));
   for(const [id,dx,dy] of [[0,0,0],[7,-.015,0],[8,.015,0],[11,-.03,.12],[12,.03,.12],[23,-.025,.32],[24,.025,.32]])p[id]={x:x+dx,y:y+dy,visibility:1,presence:1};return [p];},close:()=>{}})`}))
 })
 await page.getByRole('button',{name:players===1?'1 player':'4 players',exact:true}).click()
 await expect(page.getByLabel('Six Hoops movement demonstration')).toBeVisible();await completeReadyGate(page)
 await expect(page.locator('.hoops-game')).toHaveAttribute('data-phase','playing',{timeout:6000})
 const canvas=page.locator('.hoops-game canvas')
 await expect.poll(async()=>JSON.parse((await canvas.getAttribute('data-balls'))!).some((b:{touches:number})=>b.touches>0),{timeout:8000}).toBe(true)
 await page.screenshot({path:test.info().outputPath(`hoops-${players}-contact.png`)})
 await expect.poll(async()=>(await canvas.getAttribute('data-baskets'))!.split(',').reduce((a,b)=>a+Number(b),0),{timeout:20000}).toBeGreaterThan(0)
 await page.screenshot({path:test.info().outputPath(`hoops-${players}-basket.png`)})
 await expect(page.getByRole('button',{name:'Pause',exact:true})).toHaveCount(0)
 expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true)
 await hideAndRestoreTab(page);const frozen=await canvas.getAttribute('data-balls');await page.waitForTimeout(200);expect(await canvas.getAttribute('data-balls')).toBe(frozen)
 await page.getByRole('button',{name:'Resume round'}).click()
 const baseline=await page.evaluate(()=>performance.now());await page.clock.install();await page.clock.fastForward(baseline+50000)
 await expect(page.getByRole('dialog',{name:'Six Hoops results'})).toBeVisible()
 await expect(page.locator('.result-actions button')).toHaveCount(2)
 await page.getByRole('button',{name:'Play again',exact:true}).click();await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number;stoppedTracks:number}}).__mockMediaState)).toMatchObject({requests:1,stoppedTracks:0})
})
