import { completeReadyGate, hideAndRestoreTab, expect, openApp, test } from './fixtures'
import { isGameVisible } from '../../src/app/catalog'

test.beforeEach(() => {
  test.skip(!isGameVisible('ninja-training'), 'Hidden while individual games are refined; model and component coverage remains active.')
})

async function startDojo(page:import('@playwright/test').Page,players=1){
  await openApp(page,'#/camera/ninja-training')
  await page.getByRole('button',{name:`${players} ${players===1?'player':'players'}`,exact:true}).click()
  await completeReadyGate(page)
}
test('original towers and articulated ninjas support continuous play, pause and replay',async ({page,installMockCamera})=>{
  test.setTimeout(60_000)
  await page.addInitScript(()=>Object.assign(window,{__testClockInstalled:true}));await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'))
  await installMockCamera({person:true});await startDojo(page)
  await page.clock.runFor(4200)
  const ninja=page.getByRole('button',{name:'Swat Player 1 ninja 1',exact:true})
  await expect(ninja).toBeEnabled()
  const attack=ninja.locator('[data-sprite="attack"]')
  await expect(attack).toBeVisible()
  await expect(attack).toHaveCSS('background-image',/ninja-attack\.webp/)
  const before=await ninja.getAttribute('style')
  await page.clock.runFor(200)
  expect(await ninja.getAttribute('style')).not.toBe(before)
  await page.screenshot({path:test.info().outputPath('dojo-flight.png')})
  await ninja.focus();await page.keyboard.press('Enter')
  await expect(page.locator('.dojo-effect--hit')).toBeVisible()
  await expect(page.locator('.dojo-effect--hit [data-sprite="hit"]')).toBeVisible()
  await expect(page.locator('.dojo-game header dd').first()).toHaveText('10')
  await page.screenshot({path:test.info().outputPath('dojo-impact.png')})
  await hideAndRestoreTab(page)
  const remaining=await page.locator('.dojo-game header dd').last().textContent()
  await page.clock.runFor(5000)
  await expect(page.locator('.dojo-game header dd').last()).toHaveText(remaining!)
  await page.getByRole('button',{name:'Resume round'}).click()
  // Ninjas continue through the former bonus window after excluding paused time.
  await page.clock.runFor(18000)
  await expect(page.getByRole('button',{name:/bamboo/i})).toHaveCount(0)
  await expect(page.locator('.dojo-ninja--leap').first()).toBeEnabled()
  await page.locator('.dojo-ninja--leap').first().focus();await page.keyboard.press('Enter')
  await expect(page.locator('.dojo-effect--hit').first()).toBeVisible()
  await expect(page.getByRole('img',{name:'Detected human stick figure'})).toHaveCount(0)
  await expect(page.locator('.game-wireframe-toggle')).toHaveCount(0)
  await page.screenshot({path:test.info().outputPath('dojo-continuous-waves.png')})
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
  await expect(page.getByRole('img',{name:'Detected human stick figure'})).toHaveCount(0)
  await expect(page.locator('.game-wireframe-toggle')).toHaveCount(0)
  await expect(page.locator('.camera-arena .body-test')).toBeHidden()
  await expect(page.locator('.dojo-ninja--leap')).toHaveCount(4)
  for(const id of [1,2,3,4])await expect(page.getByLabel(`Player ${id} Paper Dojo play area`)).toBeVisible()
  expect(await page.evaluate(()=>document.fonts.check('16px "Motion Hand"'))).toBe(true)
  expect(await page.locator('#dojo-title').evaluate(e=>getComputedStyle(e).fontFamily)).toContain('Motion Hand')
  expect(await page.getByRole('button',{name:'Exit game',exact:true}).evaluate(e=>getComputedStyle(e).fontFamily)).toContain('Motion Hand')
  await page.screenshot({path:test.info().outputPath('dojo-four-players.png')})
  await page.setViewportSize({width:390,height:844})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:test.info().outputPath('dojo-narrow.png')})
})

test('marked obstacles warn first and charge only the contacted player once',async ({page,installMockCamera})=>{
  await page.addInitScript(()=>Object.assign(window,{__testClockInstalled:true}));await page.clock.install({time:new Date('2030-01-01T00:00:00Z')})
  await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'))
  await installMockCamera({person:true});await startDojo(page,4)
  await page.clock.runFor(7300)
  await expect(page.getByRole('button',{name:'Player 3 obstacle: warning'})).toBeDisabled()
  await page.clock.runFor(800)
  const hazard=page.getByRole('button',{name:'Player 3 obstacle: avoid'})
  await expect(hazard).toBeEnabled()
  const scores=page.locator('.dojo-game header dd')
  const before=Number(await scores.nth(2).textContent())
  const other=await scores.first().textContent()
  await hazard.focus();await page.keyboard.press('Enter')
  await expect(scores.nth(2)).toHaveText(String(before-10))
  await expect(scores.first()).toHaveText(other!)
  await expect(page.getByRole('button',{name:'Player 3 obstacle: bumped'})).toBeDisabled()
  await page.screenshot({path:test.info().outputPath('dojo-obstacle.png')})
})
