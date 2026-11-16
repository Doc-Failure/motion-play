import { expect, openApp, test } from './fixtures'
import { isGameVisible } from '../../src/app/catalog'

test.beforeEach(() => {
  test.skip(!isGameVisible('ninja-training'), 'Hidden while individual games are refined; model and component coverage remains active.')
})

async function startDojo(page:import('@playwright/test').Page,players=1){
  await openApp(page,'#/camera/ninja-training')
  await page.getByRole('button',{name:`${players} ${players===1?'player':'players'}`,exact:true}).click()
  await page.getByRole('button',{name:'Play Paper Dojo',exact:true}).click()
}
test('original towers and articulated ninjas support keyboard, bonus, pause and replay',async ({page,installMockCamera})=>{
  test.setTimeout(60_000)
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'))
  await installMockCamera({person:true});await startDojo(page)
  await page.clock.runFor(4200)
  const ninja=page.getByRole('button',{name:'Swat Player 1 ninja 1',exact:true})
  await expect(ninja).toBeEnabled()
  const before=await ninja.getAttribute('style')
  await page.clock.runFor(200)
  expect(await ninja.getAttribute('style')).not.toBe(before)
  await page.screenshot({path:test.info().outputPath('dojo-flight.png')})
  await ninja.focus();await page.keyboard.press('Enter')
  await expect(page.locator('.dojo-effect--hit')).toBeVisible()
  await expect(page.locator('.dojo-game header dd').first()).toHaveText('10')
  await page.screenshot({path:test.info().outputPath('dojo-impact.png')})
  await page.getByRole('button',{name:'Pause',exact:true}).click()
  const remaining=await page.locator('.dojo-game header dd').last().textContent()
  await page.clock.runFor(5000)
  await expect(page.locator('.dojo-game header dd').last()).toHaveText(remaining!)
  await page.getByRole('button',{name:'Resume round'}).click()
  // Advance into the 18s bonus window, excluding countdown and paused time.
  await page.clock.runFor(18000)
  const bamboo=page.getByRole('button',{name:'Break Player 1 bamboo',exact:true})
  await expect(bamboo).toBeVisible()
  await bamboo.focus()
  for(let i=0;i<3;i++){await page.keyboard.press('Enter');await page.clock.runFor(200)}
  await expect(page.locator('.dojo-effect--break')).toBeVisible()
  await page.screenshot({path:test.info().outputPath('dojo-bamboo.png')})
  await page.clock.fastForward(60000)
  await expect(page.getByRole('dialog',{name:'Paper Dojo results'})).toBeVisible()
  await page.getByRole('button',{name:'Play again'}).click()
  await expect(page.locator('.dojo-game header dd').first()).toHaveText('0')
})

test('camera movement swats the visible ninja and the real audio engine emits the dojo theme',async ({page,installMockCamera})=>{
  await installMockCamera({person:true})
  await page.addInitScript(()=>{
    const state={notes:0,triangles:0};Object.assign(window,{__dojoAudio:state})
    const original=AudioContext.prototype.createOscillator
    AudioContext.prototype.createOscillator=function(){const o=original.call(this),start=o.start.bind(o);o.start=(...args)=>{state.notes++;if(o.type==='triangle')state.triangles++;start(...args)};return o}
  })
  await startDojo(page)
  await page.waitForTimeout(4250)
  const video=(await page.getByLabel('Mirrored live camera during gameplay').boundingBox())!
  const ninja=(await page.locator('.dojo-ninja--leap').first().boundingBox())!
  await page.evaluate(({x,y})=>{
    const canvas=(window as typeof window&{__cameraFixture:HTMLCanvasElement}).__cameraFixture,c=canvas.getContext('2d')!
    c.fillStyle='#fff';c.fillRect((x-.055)*canvas.width,(y-.055)*canvas.height,canvas.width*.11,canvas.height*.11)
  },{x:1-(ninja.x+ninja.width/2-video.x)/video.width,y:(ninja.y+ninja.height/2-video.y)/video.height})
  await expect(page.locator('.dojo-game header dd').first()).toHaveText('10')
  await expect.poll(()=>page.evaluate(()=>(window as typeof window&{__dojoAudio:{triangles:number}}).__dojoAudio.triangles)).toBeGreaterThan(0)
  await page.getByRole('button',{name:'Mute game sound'}).click()
  const notes=await page.evaluate(()=>(window as typeof window&{__dojoAudio:{notes:number}}).__dojoAudio.notes)
  await page.waitForTimeout(800)
  expect(await page.evaluate(()=>(window as typeof window&{__dojoAudio:{notes:number}}).__dojoAudio.notes)).toBe(notes)
})

test('four-player lanes retain a clear camera center and one consistent local font',async ({page,installMockCamera})=>{
  await installMockCamera({person:true});await startDojo(page,4)
  await page.waitForTimeout(4300);await page.evaluate(()=>document.fonts.ready)
  await expect(page.locator('.dojo-tower')).toHaveCount(8)
  await expect(page.locator('.dojo-ninja--leap')).toHaveCount(4)
  for(const id of [1,2,3,4])await expect(page.getByLabel(`Player ${id} Paper Dojo play area`)).toBeVisible()
  expect(await page.locator('#dojo-title').evaluate(e=>getComputedStyle(e).fontFamily)).toContain('Motion Hand')
  expect(await page.getByRole('button',{name:'Pause',exact:true}).evaluate(e=>getComputedStyle(e).fontFamily)).toContain('Motion Hand')
  await page.screenshot({path:test.info().outputPath('dojo-four-players.png')})
  await page.setViewportSize({width:390,height:844})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:test.info().outputPath('dojo-narrow.png')})
})
