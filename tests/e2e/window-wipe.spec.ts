import {hideAndRestoreTab} from './fixtures'
import type {Page} from '@playwright/test'
import {expect,openApp,test,completeReadyGate} from './fixtures'
async function start(page:Page,players=1){
 await openApp(page,'#/camera/window-wipe',async()=>{
  await page.route('**/pose/tracker.js',route=>route.fulfill({contentType:'text/javascript',body:'window.createLocalPoseTracker=async()=>({detect:()=>[],close:()=>{}})'}))
 })
 await page.getByRole('button',{name:`${players} ${players===1?'player':'players'}`,exact:true}).click()
 await completeReadyGate(page)
 await page.clock.runFor(3200)
}
async function rub(page:Page,x:number,y:number,id=1){
 await page.getByRole('group',{name:`Player ${id} Window Wipe play area`}).evaluate((element,{x,y})=>{
  const r=element.getBoundingClientRect();element.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,buttons:1,clientX:r.x+x*r.width,clientY:r.y+y*r.height}))
 },{x,y})
}
test('soap erases in place, ink pops, windows advance with fanfare and pause/replay retain the camera',async({page,installMockCamera})=>{
 test.setTimeout(60000)
 await page.addInitScript(()=>{Object.assign(window,{__testClockInstalled:true,__washing:{notes:0,swishes:0}});const create=AudioContext.prototype.createOscillator,noise=AudioContext.prototype.createBufferSource
  AudioContext.prototype.createOscillator=function(){const voice=create.call(this),start=voice.start.bind(voice);voice.start=(...args)=>{(window as typeof window&{__washing:{notes:number}}).__washing.notes++;start(...args)};return voice}
  AudioContext.prototype.createBufferSource=function(){const voice=noise.call(this),start=voice.start.bind(voice);voice.start=(...args)=>{(window as typeof window&{__washing:{swishes:number}}).__washing.swishes++;start(...args)};return voice}
 })
 await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'))
 await installMockCamera({person:true});await start(page)
 await expect(page.locator('.body-test')).toBeHidden()
 await expect(page.locator('.wipe-foam')).toHaveCount(1)
 const alpha=()=>page.locator('.wipe-foam').evaluate(canvas=>{const c=canvas as HTMLCanvasElement;return c.getContext('2d')!.getImageData(Math.floor(c.width*.5),Math.floor(c.height*.5),1,1).data[3]})
 expect(await alpha()).toBeGreaterThan(0)
 await page.screenshot({path:test.info().outputPath('soapy-window.png')})
 await rub(page,.5,.5);await page.clock.runFor(100)
 expect(await alpha()).toBe(0)
 await expect(page.locator('.wipe-squeegee')).toBeVisible()
 await expect(page.locator('.wipe-game header dd').first()).not.toHaveText('0')
 await expect.poll(()=>page.evaluate(()=>(window as typeof window&{__washing:{swishes:number}}).__washing.swishes)).toBeGreaterThan(0)
 await page.screenshot({path:test.info().outputPath('soap-cleared.png')})
 // Spatially distinct pointer samples are a camera-free fallback, not hardware evidence.
 await page.getByRole('group',{name:'Player 1 Window Wipe play area'}).evaluate(element=>{
  const r=element.getBoundingClientRect()
  for(let row=0;row<30;row++)for(let column=0;column<40;column++)element.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,buttons:1,clientX:r.x+(column+.5)/40*r.width,clientY:r.y+(row+.5)/30*r.height}))
 })
 for(const [x,y] of [[.24,.33],[.73,.43],[.48,.73]])for(let i=0;i<3;i++){await page.clock.runFor(180);await rub(page,x+(i%2?.025:-.025),y)}
 await expect(page.getByText('Squeaky clean!',{exact:true})).toBeVisible()
 await expect(page.getByLabel('Player 1 window cleaning progress')).toHaveAttribute('aria-valuenow','100')
 await expect(page.locator('.wipe-game header dd').first()).toHaveText('180')
 await page.clock.runFor(400);await page.screenshot({path:test.info().outputPath('sparkling-window.png')})
 await hideAndRestoreTab(page)
 const score=await page.locator('.wipe-game header dd').first().textContent()
 await page.clock.runFor(4000)
 await expect(page.getByText('Squeaky clean!',{exact:true})).toBeVisible()
 await expect(page.locator('.wipe-game header dd').first()).toHaveText(score!)
 await page.getByRole('button',{name:'Resume round',exact:true}).click();await page.clock.runFor(1200)
 await expect(page.getByText('Window 2',{exact:true})).toBeVisible()
 await expect(page.getByLabel('Player 1 window cleaning progress')).toHaveAttribute('aria-valuenow','0')
 await page.getByRole('button',{name:'Mute game sound'}).click()
 const notes=await page.evaluate(()=>(window as typeof window&{__washing:{notes:number}}).__washing.notes)
 await page.clock.runFor(500)
 expect(await page.evaluate(()=>(window as typeof window&{__washing:{notes:number}}).__washing.notes)).toBe(notes)
 await page.clock.fastForward(65000);await expect(page.getByRole('dialog',{name:'Window Wipe results'})).toBeVisible()
 await expect(page.getByRole('dialog').getByRole('heading')).toBeFocused()
 await page.getByRole('button',{name:'Wipe again'}).click();await completeReadyGate(page)
 await expect(page.locator('.wipe-game header dd').first()).toHaveText('0')
 await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(3300)
 expect(await page.locator('.wipe-foam').evaluate(e=>getComputedStyle(e).animationName)).toBe('none')
 await page.evaluate(()=>{
  const observed:number[]=[],original=CanvasRenderingContext2D.prototype.arc
  Object.assign(window,{__reducedParticleY:observed})
  CanvasRenderingContext2D.prototype.arc=function(...args:Parameters<CanvasRenderingContext2D['arc']>){if(this.canvas.classList.contains('wipe-particles'))observed.push(args[1]);return original.apply(this,args)}
 })
 await rub(page,.5,.5);await page.clock.runFor(220)
 const positions=await page.evaluate(()=>(window as typeof window&{__reducedParticleY:number[]}).__reducedParticleY)
 expect(positions.length).toBeGreaterThan(5)
 expect(Math.max(...positions)-Math.min(...positions)).toBeLessThan(.01)
 expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number}}).__mockMediaState.requests)).toBe(1)
})

test('real motion-mask samples erase only their mirrored player lane with no scrolling in narrow layouts',async({page,installMockCamera})=>{
 test.setTimeout(60000)
 await page.addInitScript(()=>Object.assign(window,{__testClockInstalled:true}));await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'))
 await installMockCamera({person:true});await start(page,4)
 await page.evaluate(()=>{
  const state=window as typeof window&{__cameraFixture:HTMLCanvasElement},c=state.__cameraFixture,ctx=c.getContext('2d')!;let frame=0
  window.setInterval(()=>{ctx.fillStyle=frame++%2?'#fff':'#121f30';ctx.fillRect(c.width*.055,c.height*.47,c.width*.055,c.height*.06)},70)
 })
 await page.clock.runFor(1000)
 const scores=page.locator('.wipe-game header dd')
 await expect(scores.nth(3)).not.toHaveText('0')
 for(let i=0;i<3;i++)await expect(scores.nth(i)).toHaveText('0')
 await expect(page.getByRole('group',{name:'Team Window Wipe play area'})).toBeVisible()
 await page.screenshot({path:test.info().outputPath('four-player-washing.png')})
 await page.setViewportSize({width:390,height:844});await page.clock.runFor(100)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true)
 await page.screenshot({path:test.info().outputPath('narrow-washing.png')})
})
