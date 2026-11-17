import {hideAndRestoreTab} from './fixtures'
import {completeReadyGate,expect,openApp,test} from './fixtures'
for(const players of [1,4])test(`Ghost Catcher ${players} players: rubbing, pause, results and persistent camera`,async({page,installMockCamera})=>{
 test.setTimeout(60000)
 if(players===4)await page.emulateMedia({reducedMotion:'reduce'})
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await installMockCamera({person:true})
 await openApp(page,'#/camera/ghost-catcher',async()=>{await page.route('**/pose/tracker.js',r=>r.fulfill({contentType:'text/javascript',body:'window.createLocalPoseTracker=async()=>({detect:()=>[],close:()=>{}})'}))})
 await page.getByRole('button',{name:players===1?'1 player':'4 players',exact:true}).click()
 await expect(page.getByLabel('Ghost Catcher movement demonstration')).toBeVisible()
 await completeReadyGate(page)
 await expect(page.locator('.ghost-game')).toHaveAttribute('data-phase','playing',{timeout:6000})
 const canvas=page.locator('.ghost-game canvas').first(),bounds=await canvas.boundingBox();expect(bounds).toBeTruthy()
 for(let i=0;i<24;i++){
  const ghosts=JSON.parse((await canvas.getAttribute('data-ghosts'))!) as {x:number;y:number;state:string}[],g=ghosts.find(g=>g.state==='rising');if(g)await page.mouse.move(bounds!.x+g.x*bounds!.width+(i%2?3:-3),bounds!.y+g.y*bounds!.height)
  await page.waitForTimeout(40)
 }
 await expect.poll(async()=>Number(await page.locator('.ghost-game header dd').first().textContent())).toBeGreaterThan(0)
 if(players===4)await expect(page.locator('.ghost-game header dd').nth(3)).toHaveText('0')
 expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true)
 await page.screenshot({path:test.info().outputPath(`ghost-${players}.png`)})
 await hideAndRestoreTab(page);const frozen=await canvas.getAttribute('data-ghosts');await page.waitForTimeout(200);expect(await canvas.getAttribute('data-ghosts')).toBe(frozen)
 await page.getByRole('button',{name:'Resume round'}).click()
 const baseline=await page.evaluate(()=>performance.now());await page.clock.install();await page.clock.fastForward(baseline+49000)
 await expect(page.getByRole('dialog',{name:'Ghost Catcher results'})).toBeVisible()
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
