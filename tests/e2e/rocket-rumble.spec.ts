import {expect,openApp,test} from './fixtures'
async function start(page:import('@playwright/test').Page,players=1){
 await openApp(page,'#/camera/rocket-rumble');await page.getByRole('button',{name:`${players} ${players===1?'player':'players'}`,exact:true}).click();await page.getByRole('button',{name:'Play Rocket Rumble',exact:true}).click()
}
test('matching chains launch staggered animated fireworks, pause, results and replay',async({page,installMockCamera})=>{
 test.setTimeout(90000)
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
 await page.clock.install({time:new Date('2030-01-01')});await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'))
 await page.addInitScript(()=>{Object.assign(window,{__fireworksNoise:0});const original=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){(window as typeof window&{__fireworksNoise:number}).__fireworksNoise++;return original.apply(this,args)}})
 await installMockCamera({person:true});await start(page);await page.clock.runFor(5500)
 for(const id of [1,6,8]){await page.getByRole('button',{name:new RegExp(`^Tag Sun rocket ${id} for Player 1$`)}).focus();await page.keyboard.press('Enter');await page.clock.runFor(200)}
 await expect(page.locator('.sky-rocket--selected')).toHaveCount(3)
 await page.screenshot({path:test.info().outputPath('tagged-chain.png')})
 await page.getByRole('button',{name:'Launch Player 1 fireworks'}).click();await page.clock.runFor(650)
 await expect(page.locator('.rocket-game header dd').first()).toHaveText('90')
 await expect(page.getByText('BRILLIANT!',{exact:false})).toBeVisible()
 const canvas=page.locator('.fireworks-canvas')
 const pixels=await canvas.evaluate(c=>{const e=c as HTMLCanvasElement;return e.getContext('2d')!.getImageData(0,0,e.width,e.height).data.filter((v,i)=>i%4===3&&v>0).length})
 expect(pixels).toBeGreaterThan(300)
 await page.screenshot({path:test.info().outputPath('fireworks-burst.png')})
 expect(await page.evaluate(()=>(window as typeof window&{__fireworksNoise:number}).__fireworksNoise)).toBeGreaterThan(0)
 await page.getByRole('button',{name:'Mute game sound'}).click()
 await page.getByRole('button',{name:'Pause',exact:true}).click();const before=await canvas.evaluate(c=>(c as HTMLCanvasElement).toDataURL());await page.clock.runFor(4000);expect(await canvas.evaluate(c=>(c as HTMLCanvasElement).toDataURL())).toBe(before)
 await page.getByRole('button',{name:'Resume round'}).click();await page.clock.runFor(42000);await expect(page.locator('.rocket-cue')).toContainText('GRAND FINALE')
 await page.clock.fastForward(60000);await expect(page.getByRole('dialog',{name:'Rocket Rumble results'})).toBeVisible()
 await page.getByRole('button',{name:'Play again'}).click();await expect(page.locator('.rocket-game header dd').first()).toHaveText('0');expect(errors).toEqual([])
})
test('four-player camera lanes stay clear and reduced motion remains playable',async({page,installMockCamera})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await installMockCamera({person:true});await start(page,4);await page.waitForTimeout(5500)
 await expect(page.locator('.sky-rocket')).toHaveCount(36);await expect(page.locator('.fireworks-canvas')).toHaveCount(4)
 for(const size of [{width:1280,height:720},{width:390,height:844}]){await page.setViewportSize(size);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);await page.screenshot({path:test.info().outputPath(`rockets-${size.width}.png`)})}
 await expect(page.getByLabel('Mirrored live camera during gameplay')).toBeVisible()
})
test('real motion processor tags a visible rocket without mouse input',async({page,installMockCamera})=>{
 await installMockCamera({person:true});await start(page);await page.waitForTimeout(5500)
 const video=(await page.getByLabel('Mirrored live camera during gameplay').boundingBox())!,rocket=(await page.getByRole('button',{name:'Tag Sun rocket 1 for Player 1',exact:true}).boundingBox())!
 await page.evaluate(({x,y})=>{const canvas=(window as typeof window&{__cameraFixture:HTMLCanvasElement}).__cameraFixture,c=canvas.getContext('2d')!;c.fillStyle='#fff';c.fillRect((x-.04)*canvas.width,(y-.04)*canvas.height,canvas.width*.08,canvas.height*.08)},{x:1-(rocket.x+rocket.width/2-video.x)/video.width,y:(rocket.y+rocket.height/2-video.y)/video.height})
 await expect(page.getByRole('button',{name:'Tagged Sun rocket 1 for Player 1',exact:true})).toHaveAttribute('aria-pressed','true')
})
