import {test,expect,openApp,completeReadyGate} from './fixtures'
for(const players of [1,4] as const)test(`Jump Rush ${players} players: measured torso jumps, results and replay`,async({page,installMockCamera})=>{
 test.setTimeout(45000)
 await installMockCamera({person:true})
 await openApp(page,'#/camera/jump-rush',async()=>{
  await page.route('**/pose/tracker.js',r=>r.fulfill({contentType:'text/javascript',body:`window.createLocalPoseTracker=async()=>({detect:()=>{
   const parent=window.parent,el=parent.document.querySelector('.jump-hurdle');const x=parseFloat(el?.style.left||'100');const rise=x<45&&x>20?.09:0;
   return Array.from({length:${players}},(_,i)=>{const x=1-(i+.5)/${players};const p=Array.from({length:33},()=>({x,y:.5,visibility:0,presence:1}));
   for(const [id,dx,y] of [[0,0,.28],[7,-.02,.28],[8,.02,.28],[11,-.04,.4],[12,.04,.4],[23,-.03,.65],[24,.03,.65],[13,-.05,.5],[14,.05,.5],[15,-.06,.55],[16,.06,.55]])p[id]={x:x+dx,y:y-rise,visibility:1,presence:1};return p;});},close:()=>{}})`}))
 })
 await page.getByRole('button',{name:players===1?'1 player':'4 players',exact:true}).click()
 await expect(page.getByLabel('Jump Rush movement demonstration')).toBeVisible()
 await completeReadyGate(page)
 await expect(page.locator('.jump-game')).toHaveAttribute('data-phase','playing',{timeout:6000})
 await expect.poll(async()=>Number(await page.locator('.jump-game header dd').first().textContent()),{timeout:8000}).toBeGreaterThanOrEqual(10)
 await expect(page.getByRole('button',{name:'Pause',exact:true})).toHaveCount(0)
 await page.screenshot({path:test.info().outputPath(`jump-${players}.png`)})
 expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true)
 const baseline=await page.evaluate(()=>performance.now());await page.clock.install();await page.clock.fastForward(baseline+45000)
 await expect(page.getByRole('dialog',{name:'Jump Rush results'})).toBeVisible()
 await expect(page.locator('.result-actions button')).toHaveCount(2)
 await page.getByRole('button',{name:'Play again',exact:true}).click()
 await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number;stoppedTracks:number}}).__mockMediaState)).toMatchObject({requests:1,stoppedTracks:0})
})
