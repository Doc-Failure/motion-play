import {hideAndRestoreTab} from './fixtures'
import type {Page} from '@playwright/test'
import {expect,openApp,test,completeReadyGate} from './fixtures'
import {beatChart,beatPads} from '../../src/minigames/beat-freak/BeatModel'
async function start(page:Page,players=1){
 await openApp(page,'#/camera/beat-freak')
 await page.getByRole('button',{name:`${players} ${players===1?'player':'players'}`,exact:true}).click()
 await completeReadyGate(page)
 await page.clock.runFor(3100)
}
async function until(page:Page,elapsed:number){const now=Number(await page.locator('.beat-game').getAttribute('data-elapsed'));if(elapsed>now)await page.clock.runFor(elapsed-now)}
test('records arrive on the beat, keyboard instruments build combos, audio schedules ahead and pause/mute/replay recover',async({page,installMockCamera})=>{
 test.setTimeout(60000)
 await page.addInitScript(()=>{
  Object.assign(window,{__testClockInstalled:true,__beatAudio:{notes:0,ahead:0}})
  const create=AudioContext.prototype.createOscillator
  AudioContext.prototype.createOscillator=function(){const voice=create.call(this),start=voice.start.bind(voice),now=()=>this.currentTime;voice.start=(...args)=>{const stats=(window as typeof window&{__beatAudio:{notes:number;ahead:number}}).__beatAudio;stats.notes++;if((args[0]??0)>now()+.01)stats.ahead++;start(...args)};return voice}
 })
 await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'))
 await installMockCamera({person:true});await start(page)
 await until(page,1600);await expect(page.locator('.beat-note').first()).toBeVisible()
 const first=await page.locator('.beat-note').first().getAttribute('style');await page.clock.runFor(200)
 expect(await page.locator('.beat-note').first().getAttribute('style')).not.toBe(first)
 await page.screenshot({path:test.info().outputPath('paper-jam-records.png')})
 const board=page.getByRole('group',{name:'Player 1 Paper Jam play area'})
 for(const note of beatChart().slice(0,8)){
  await until(page,note.at);await board.focus();await page.keyboard.press(String(note.pad+1))
 }
 await expect(page.locator('.beat-game header dd').first()).toHaveText('120')
 await expect(page.locator('.beat-combo strong')).toHaveText('8')
 await expect(page.getByText('ON FIRE!',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>(window as typeof window&{__beatAudio:{ahead:number}}).__beatAudio.ahead)).toBeGreaterThan(0)
 await page.screenshot({path:test.info().outputPath('paper-jam-combo.png')})
 await hideAndRestoreTab(page)
 const frozen=await page.locator('.beat-boards').innerHTML(),clock=await page.locator('.beat-game header dd').last().textContent()
 const notes=await page.evaluate(()=>(window as typeof window&{__beatAudio:{notes:number}}).__beatAudio.notes)
 await page.clock.runFor(4000)
 expect(await page.locator('.beat-boards').innerHTML()).toBe(frozen)
 await expect(page.locator('.beat-game header dd').last()).toHaveText(clock!)
 expect(await page.evaluate(()=>(window as typeof window&{__beatAudio:{notes:number}}).__beatAudio.notes)).toBe(notes)
 await page.getByRole('button',{name:'Resume round'}).click()
 await until(page,7200);await board.focus();await page.keyboard.press('3')
 await expect(page.locator('.beat-game header dd').first()).toHaveText('150')
 await page.getByRole('button',{name:'Mute game sound'}).click()
 const muted=await page.evaluate(()=>(window as typeof window&{__beatAudio:{notes:number}}).__beatAudio.notes)
 await page.clock.runFor(500)
 expect(await page.evaluate(()=>(window as typeof window&{__beatAudio:{notes:number}}).__beatAudio.notes)).toBe(muted)
 await page.clock.fastForward(65000)
 await expect(page.getByRole('dialog',{name:'Paper Jam results'})).toBeVisible()
 await expect(page.getByRole('dialog').getByRole('heading')).toBeFocused()
 await page.getByRole('button',{name:'Play again'}).click();await completeReadyGate(page)
 await expect(page.locator('.beat-game header dd').first()).toHaveText('0')
 await page.emulateMedia({reducedMotion:'reduce'});await page.clock.runFor(4800)
 expect(await page.locator('.beat-note').first().evaluate(e=>getComputedStyle(e).rotate)).toBe('0deg')
 expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number;stoppedTracks:number}}).__mockMediaState)).toMatchObject({requests:1,stoppedTracks:0})
})

test('four-player mirrored camera motion hits only its speaker lane and layouts fit without scrolling',async({page,installMockCamera})=>{
 test.setTimeout(60000)
 await page.addInitScript(()=>Object.assign(window,{__testClockInstalled:true}));await page.clock.install({time:new Date('2030-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'))
 await installMockCamera({person:true});await start(page,4)
 await until(page,2240)
 await page.evaluate(({x,y})=>{
  const c=(window as typeof window&{__cameraFixture:HTMLCanvasElement}).__cameraFixture,ctx=c.getContext('2d')!;let frame=0
  window.setInterval(()=>{ctx.fillStyle=frame++%2?'#fff':'#182033';ctx.fillRect((x-.025)*c.width,(y-.03)*c.height,.05*c.width,.06*c.height)},50)
 },{x:1-(3+beatPads[0].x)/4,y:beatPads[0].y})
 await page.clock.runFor(350)
 const scores=page.locator('.beat-game header dd')
 await expect(scores.nth(3)).not.toHaveText('0');for(let i=0;i<3;i++)await expect(scores.nth(i)).toHaveText('0')
 await expect(page.locator('.beat-speaker')).toHaveCount(16)
 await expect(page.locator('.camera-arena .body-test')).toBeHidden()
 await page.screenshot({path:test.info().outputPath('paper-jam-four-player.png')})
 await page.setViewportSize({width:390,height:844});await page.clock.runFor(100)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true)
 await page.screenshot({path:test.info().outputPath('paper-jam-mobile.png')})
})
