import {hideAndRestoreTab} from './fixtures'
import {completeReadyGate,expect,openApp,test} from './fixtures'
test('bat sprite flaps and reacts when touched',async({page,installMockCamera})=>{
 test.setTimeout(35000)
 await page.addInitScript(()=>{
  const frames:string[]=[];Object.assign(window,{__batFrames:frames})
  const draw=CanvasRenderingContext2D.prototype.drawImage
  CanvasRenderingContext2D.prototype.drawImage=(function(this:CanvasRenderingContext2D,...args:Parameters<typeof draw>){
   if(args[0] instanceof HTMLImageElement&&args[0].src.includes('bat-poses.webp'))frames.push(`${args[1]/(args[0].naturalWidth/2)},${args[2]/(args[0].naturalHeight/2)}`)
   return Reflect.apply(draw,this,args)
  }) as typeof draw
 })
 await installMockCamera({person:true})
 await openApp(page,'#/camera/ghost-catcher',async()=>{await page.route('**/pose/tracker.js',r=>r.fulfill({contentType:'text/javascript',body:'window.createLocalPoseTracker=async()=>({detect:()=>[],close:()=>{}})'}))})
 await page.getByRole('button',{name:'1 player',exact:true}).click();await completeReadyGate(page)
 const canvas=page.locator('.ghost-game canvas').first()
 const bounds=(await canvas.boundingBox())!
 for(let i=0;i<260;i++){
  const ghosts=JSON.parse((await canvas.getAttribute('data-ghosts'))||'[]') as {x:number;y:number;bat:boolean;state:string}[]
  if(ghosts.some(g=>g.bat&&g.state==='rising'))break
  const ghost=ghosts.find(g=>g.state==='rising')
  if(ghost)await page.mouse.move(bounds.x+ghost.x*bounds.width+(i%2?3:-3),bounds.y+ghost.y*bounds.height)
  await page.waitForTimeout(40)
 }
 await expect.poll(async()=>JSON.parse((await canvas.getAttribute('data-ghosts'))||'[]').some((g:{bat:boolean;state:string})=>g.bat&&g.state==='rising')).toBe(true)
 await expect.poll(()=>page.evaluate(()=>(window as typeof window&{__batFrames:string[]}).__batFrames),{timeout:3000}).toEqual(expect.arrayContaining(['0,0','1,0','0,1']))
 await page.screenshot({path:test.info().outputPath('ghost-bat-flight.png')})
 for(let i=0;i<12;i++){
  const bat=JSON.parse((await canvas.getAttribute('data-ghosts'))!).find((g:{bat:boolean;state:string})=>g.bat&&g.state==='rising')
  if(!bat)break
  await page.mouse.move(bounds.x+bat.x*bounds.width+(i%2?3:-3),bounds.y+bat.y*bounds.height)
  await page.waitForTimeout(40)
 }
 await expect.poll(()=>page.evaluate(()=>(window as typeof window&{__batFrames:string[]}).__batFrames)).toContain('1,1')
})
for(const players of [1,4])test(`Ghost Catcher ${players} players: rubbing, pause, results and persistent camera`,async({page,installMockCamera})=>{
 test.setTimeout(60000)
 if(players===1)await page.addInitScript(()=>{
  const frames:string[]=[];Object.assign(window,{__ghostFrames:frames})
  const draw=CanvasRenderingContext2D.prototype.drawImage
  CanvasRenderingContext2D.prototype.drawImage=(function(this:CanvasRenderingContext2D,...args:Parameters<typeof draw>){
   if(args[0] instanceof HTMLImageElement&&args[0].src.includes('ghost-poses.webp'))frames.push(`${args[1]/(args[0].naturalWidth/2)},${args[2]/(args[0].naturalHeight/2)}`)
   return Reflect.apply(draw,this,args)
  }) as typeof draw
 })
 if(players===4)await page.emulateMedia({reducedMotion:'reduce'})
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await installMockCamera({person:true})
 await openApp(page,'#/camera/ghost-catcher',async()=>{await page.route('**/pose/tracker.js',r=>r.fulfill({contentType:'text/javascript',body:'window.createLocalPoseTracker=async()=>({detect:()=>[],close:()=>{}})'}))})
 await page.getByRole('button',{name:players===1?'1 player':'4 players',exact:true}).click()
 await expect(page.getByLabel('Ghost Catcher movement demonstration')).toBeVisible()
 await completeReadyGate(page)
 await expect(page.locator('.ghost-game')).toHaveAttribute('data-phase','playing',{timeout:6000})
 for(let i=1;i<=players;i++)await expect(page.locator('.ghost-game header').getByLabel(`Player ${i}: 5 lives`)).toBeVisible()
 const canvas=page.locator('.ghost-game canvas').first(),bounds=await canvas.boundingBox();expect(bounds).toBeTruthy()
 if(players===1)await expect.poll(()=>page.evaluate(()=>(window as typeof window&{__ghostFrames:string[]}).__ghostFrames)).toEqual(expect.arrayContaining(['0,0','1,0']))
 for(let i=0;i<24;i++){
  const ghosts=JSON.parse((await canvas.getAttribute('data-ghosts'))!) as {x:number;y:number;state:string}[],g=ghosts.find(g=>g.state==='rising');if(g)await page.mouse.move(bounds!.x+g.x*bounds!.width+(i%2?3:-3),bounds!.y+g.y*bounds!.height)
  await page.waitForTimeout(40)
 }
 await expect.poll(async()=>Number(await page.locator('.ghost-game header dd').first().textContent())).toBeGreaterThan(0)
 if(players===1)await expect.poll(()=>page.evaluate(()=>(window as typeof window&{__ghostFrames:string[]}).__ghostFrames)).toEqual(expect.arrayContaining(['0,1','1,1']))
 if(players===4)await expect(page.locator('.ghost-game header dd').nth(3)).toHaveText('0')
 expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true)
 await page.screenshot({path:test.info().outputPath(`ghost-${players}.png`)})
 await hideAndRestoreTab(page);const frozen=await canvas.getAttribute('data-ghosts');await page.waitForTimeout(200);expect(await canvas.getAttribute('data-ghosts')).toBe(frozen)
 await page.getByRole('button',{name:'Resume round'}).click()
 const baseline=await page.evaluate(()=>performance.now());await page.clock.install();await page.clock.fastForward(baseline+49000)
 await expect(page.getByRole('dialog',{name:'Ghost Catcher results'})).toBeVisible()
 if(players===4)await expect(page.getByRole('dialog',{name:'Ghost Catcher results'})).toHaveCSS('animation-name','none')
 await page.getByRole('button',{name:'Play again',exact:true}).click();await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number;stoppedTracks:number}}).__mockMediaState)).toMatchObject({requests:1,stoppedTracks:0});expect(errors).toEqual([])
})

test('moving camera pixels inflate and capture a ghost without pointer input',async({page,installMockCamera})=>{
 await installMockCamera({person:true})
 await openApp(page,'#/camera/ghost-catcher',async()=>{await page.route('**/pose/tracker.js',r=>r.fulfill({contentType:'text/javascript',body:'window.createLocalPoseTracker=async()=>({detect:()=>[],close:()=>{}})'}))})
 await page.getByRole('button',{name:'1 player',exact:true}).click();await completeReadyGate(page)
 await expect(page.locator('.ghost-game')).toHaveAttribute('data-phase','playing',{timeout:6000})
 await page.evaluate(()=>{const canvas=(window as typeof window&{__cameraFixture:HTMLCanvasElement}).__cameraFixture,c=canvas.getContext('2d')!;let frame=0
  const timer=setInterval(()=>{const el=document.querySelector('.ghost-game canvas');if(!el){clearInterval(timer);return}const ghosts=JSON.parse(el.getAttribute('data-ghosts')!) as {x:number;y:number;state:string}[],g=ghosts.find(g=>g.state==='rising');c.fillStyle='#607b83';c.fillRect(0,0,320,240);if(g){c.fillStyle=frame++%2?'#fff':'#131313';c.fillRect((1-g.x)*320-24,g.y*240-18,48,36)}},50)
 })
 await expect.poll(async()=>Number(await page.locator('.ghost-game header dd').first().textContent()),{timeout:7000}).toBeGreaterThan(0)
})


test('escape warning stays aligned with rising ghosts',async({page,installMockCamera})=>{
 await installMockCamera({person:true})
 await openApp(page,'#/camera/ghost-catcher',async()=>{await page.route('**/pose/tracker.js',r=>r.fulfill({contentType:'text/javascript',body:'window.createLocalPoseTracker=async()=>({detect:()=>[],close:()=>{}})'}))})
 await page.getByRole('button',{name:'1 player',exact:true}).click();await completeReadyGate(page)
 await expect(page.locator('.ghost-game')).toHaveAttribute('data-phase','playing',{timeout:6000})
 await expect.poll(async()=>{
  const ghosts=JSON.parse((await page.locator('.ghost-game canvas').getAttribute('data-ghosts'))!) as {y:number;state:string}[]
  return ghosts.some(g=>g.state==='rising'&&g.y<.3)
 },{timeout:12000}).toBe(true)
 await page.screenshot({path:test.info().outputPath('ghost-warning.png')})
})
