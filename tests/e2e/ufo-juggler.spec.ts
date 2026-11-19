import {hideAndRestoreTab} from './fixtures'
import {completeReadyGate,expect,openApp,test} from './fixtures'
import type {Saucer} from '../../src/minigames/ufo-juggler/UfoModel'
for(const players of [1,4])test(`UFO Juggler ${players} players: spin, coast, launch, pause and replay`,async({page,installMockCamera})=>{
 test.setTimeout(60000)
 if(players===4)await page.emulateMedia({reducedMotion:'reduce'})
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await installMockCamera({person:true})
 await openApp(page,'#/camera/ufo-juggler',async()=>{await page.route('**/pose/tracker.js',r=>r.fulfill({contentType:'text/javascript',body:'window.createLocalPoseTracker=async()=>({detect:()=>[],close:()=>{}})'}))})
 await page.getByRole('button',{name:players===1?'1 player':'4 players',exact:true}).click()
 await expect(page.getByLabel('UFO Juggler movement demonstration')).toBeVisible();await completeReadyGate(page)
 await expect(page.locator('.ufo-game')).toHaveAttribute('data-phase','playing',{timeout:6000})
 for(let i=1;i<=players;i++)await expect(page.locator('.ufo-game header').getByLabel(`Player ${i}: 3 lives`)).toBeVisible()
 await expect(page.getByRole('button',{name:'Pause',exact:true})).toHaveCount(0)
 await expect(page.locator('.game-wireframe-toggle')).toHaveCount(0)
 const canvas=page.locator('.ufo-game canvas').first(),bounds=await canvas.boundingBox();expect(bounds).toBeTruthy()
 for(let i=0;i<110;i++){
  const ships=JSON.parse((await canvas.getAttribute('data-ships'))!) as Saucer[],ship=ships.find(s=>s.state==='flying'&&s.spin<.85)
  if(ship)await page.mouse.move(bounds!.x+ship.x*bounds!.width+(i%2?3:-3),bounds!.y+ship.y*bounds!.height)
  if(i===24)await page.screenshot({path:test.info().outputPath(`ufo-${players}-flight.png`)})
  await page.waitForTimeout(40)
 }
 await expect.poll(async()=>Number(await page.locator('.ufo-game header dd').first().textContent())).toBeGreaterThanOrEqual(50)
 if(players===4)await expect(page.locator('.ufo-game header dd').nth(3)).toHaveText('0')
 expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true)
 await hideAndRestoreTab(page);const frozen=await canvas.getAttribute('data-ships');await page.waitForTimeout(200);expect(await canvas.getAttribute('data-ships')).toBe(frozen)
 await page.getByRole('button',{name:'Resume round'}).click()
 const baseline=await page.evaluate(()=>performance.now());await page.clock.install();await page.clock.fastForward(baseline+45000)
 const result=page.getByRole('dialog',{name:'UFO Juggler results'});await expect(result).toBeVisible()
 await expect(result.locator('.result-actions button')).toHaveCount(2)
 const boxes=await result.locator('.result-actions button').evaluateAll(buttons=>buttons.map(b=>b.getBoundingClientRect().toJSON()))
 expect(boxes[0].top).toBeCloseTo(boxes[1].top,0);expect(boxes[0].right).toBeLessThan(boxes[1].left)
 await page.screenshot({path:test.info().outputPath(`ufo-${players}-results.png`)})
 await page.getByRole('button',{name:'Play again',exact:true}).click();await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number;stoppedTracks:number}}).__mockMediaState)).toMatchObject({requests:1,stoppedTracks:0});expect(errors).toEqual([])
})

test('synthetic webcam waving overheats when continuous, then launches with controlled bursts',async({page,installMockCamera})=>{
 test.setTimeout(45000)
 await installMockCamera({person:true})
 await openApp(page,'#/camera/ufo-juggler',async()=>{await page.route('**/pose/tracker.js',r=>r.fulfill({contentType:'text/javascript',body:'window.createLocalPoseTracker=async()=>({detect:()=>[],close:()=>{}})'}))})
 await page.getByRole('button',{name:'1 player',exact:true}).click();await completeReadyGate(page)
 await expect(page.locator('.ufo-game')).toHaveAttribute('data-phase','playing',{timeout:6000})
 await page.evaluate(()=>{const canvas=(window as typeof window&{__cameraFixture:HTMLCanvasElement}).__cameraFixture,c=canvas.getContext('2d')!;let frame=0
  const state={overheated:false,peakShips:0};Object.assign(window,{__ufoPilot:state})
  const timer=setInterval(()=>{const el=document.querySelector('.ufo-game canvas');if(!el){clearInterval(timer);return}const ships=JSON.parse(el.getAttribute('data-ships')!) as {x:number;y:number;spin:number;cue:string;state:string}[],ship=ships.find(g=>g.state==='flying');state.peakShips=Math.max(state.peakShips,ships.filter(s=>s.state==='flying').length);if(ship?.cue==='overheat')state.overheated=true
   c.fillStyle='#607b83';c.fillRect(0,0,320,240)
   for(const current of ships.filter(v=>v.state==='flying'&&(!state.overheated||v.spin<.8))){c.fillStyle=frame%2?'#fff':'#131313';c.fillRect((1-current.x)*320-24,current.y*240-18,48,36)}frame++
  },50)
 })
 await expect.poll(()=>page.evaluate(()=>(window as typeof window&{__ufoPilot:{overheated:boolean}}).__ufoPilot.overheated),{timeout:8000}).toBe(true)
 await page.screenshot({path:test.info().outputPath('ufo-overheat.png')})
 await expect.poll(async()=>Number(await page.locator('.ufo-game header dd').first().textContent()),{timeout:10000}).toBeGreaterThanOrEqual(50)
 await expect.poll(()=>page.evaluate(()=>(window as typeof window&{__ufoPilot:{peakShips:number}}).__ufoPilot.peakShips),{timeout:16000}).toBeGreaterThanOrEqual(2)
 await page.screenshot({path:test.info().outputPath('ufo-juggling-pair.png')})
})
