import {hideAndRestoreTab} from './fixtures'
import {completeReadyGate,expect,openApp,test} from './fixtures'
import type {Page} from '@playwright/test'
async function installFootballPose(page:Page){
 await page.route('**/pose/tracker.js',route=>route.fulfill({contentType:'text/javascript',body:`
 window.createLocalPoseTracker=async(players)=>({detect:()=>{
  if(parent.__loseFootballPose)return [];
  return Array.from({length:players},(_,i)=>{
   const center=(i+.5)/players,x=1-center,p=Array.from({length:33},()=>({x,y:.5,visibility:1,presence:1}));
   const ball=parent.document.querySelectorAll('.keep-ups-game canvas')[i];
   const localX=Number(ball?.dataset.ballX??.5),hx=1-(i+localX)/players;
   for(const j of [0,2,5,7,8])p[j]={x:hx,y:.4,visibility:1};
   p[11]={x:x-.06/players,y:.55,visibility:1};p[12]={x:x+.06/players,y:.55,visibility:1};
   p[23]={x:x-.04/players,y:.8,visibility:1};p[24]={x:x+.04/players,y:.8,visibility:1};
   for(const j of [15,17,19,21])p[j]={x,y:parent.document.querySelector('.player-ready-gate')?.68:.85,visibility:1};
   p[16]={x,y:.85,visibility:.1};return p;
  })},close:()=>{}})
 `}))
}
for(const players of [1,4])test(`${players} players keep the ball up using measured poses, with pause and camera reuse`,async({page,installMockCamera})=>{
 test.setTimeout(60000)
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await installMockCamera({person:true})
 await openApp(page,'#/camera/keep-ups',()=>installFootballPose(page))
 await page.getByRole('button',{name:players===1?'1 player':'4 players',exact:true}).click()
 await expect(page.getByLabel('Keep Ups movement demonstration')).toBeVisible()
 await expect(page.getByLabel('Players ready check',{exact:true})).toHaveCount(0,{timeout:15000})
 await expect(page.locator('.keep-ups-game')).toHaveAttribute('data-phase','playing',{timeout:6000})
 await expect(page.locator('.keep-ups-game canvas')).toHaveCount(players)
 for(let i=1;i<=players;i++)await expect(page.locator('.keep-ups-game header').getByLabel(`Player ${i}: 3 lives`)).toBeVisible()
 for(let i=0;i<players;i++)await expect.poll(async()=>Number(await page.locator('.keep-ups-game canvas').nth(i).getAttribute('data-touches')),{timeout:7000}).toBeGreaterThanOrEqual(2)
 const canvas=page.locator('.keep-ups-game canvas').first()
 await expect(canvas).toHaveAttribute('data-lives','3')
 if(players===1){await expect(canvas).toHaveAttribute('data-wind','warning',{timeout:10000});await page.screenshot({path:test.info().outputPath('keep-ups-wind-warning.png')});await expect(canvas).toHaveAttribute('data-wind','gust')}
 await page.screenshot({path:test.info().outputPath(`keep-ups-${players}.png`)})
 await page.evaluate(()=>Object.assign(window,{__loseFootballPose:true}))
 await page.waitForTimeout(450)
 const score=await page.locator('.keep-ups-game header dd').first().textContent()
 await page.waitForTimeout(1300)
 await expect(page.locator('.keep-ups-game header dd').first()).toHaveText(score!)
 await hideAndRestoreTab(page)
 const y=await canvas.getAttribute('data-ball-y');await page.waitForTimeout(250);await expect(canvas).toHaveAttribute('data-ball-y',y!)
 await page.getByRole('button',{name:'Resume round'}).click()
 const beforeClock=await page.evaluate(()=>performance.now())
 await page.clock.install();await page.clock.fastForward(beforeClock+16000)
 await expect(page.getByRole('dialog',{name:'Keep Ups results'})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Out of lives!',exact:true})).toBeVisible()
 await expect(canvas).toHaveAttribute('data-lives','0')
 await page.getByRole('button',{name:'Play again',exact:true}).click()
 await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
 await expect(canvas).toHaveAttribute('data-lives','3')
 expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number;stoppedTracks:number}}).__mockMediaState)).toMatchObject({requests:1,stoppedTracks:0})
 expect(errors).toEqual([])
})
test('Keep Ups supports pointer fallback when pose tracking is unavailable',async({page,installMockCamera})=>{
 await installMockCamera({person:true})
 await openApp(page,'#/camera/keep-ups',async()=>{await page.route('**/pose/tracker.js',route=>route.fulfill({contentType:'text/javascript',body:'window.createLocalPoseTracker=async()=>({detect:()=>[],close:()=>{}})'}))})
 await page.getByRole('button',{name:'1 player',exact:true}).click();await completeReadyGate(page)
 await expect(page.locator('.keep-ups-game')).toHaveAttribute('data-phase','playing',{timeout:6000})
 const lane=page.getByRole('group',{name:'Player 1 Keep Ups play area'}),bounds=(await lane.boundingBox())!
 for(let i=0;i<40;i++){const x=Number(await page.locator('.keep-ups-game canvas').getAttribute('data-ball-x'));await page.mouse.move(bounds.x+bounds.width*x,bounds.y+bounds.height*.4);await page.waitForTimeout(30)}
 await expect.poll(async()=>Number(await page.locator('.keep-ups-game header dd').first().textContent())).toBeGreaterThan(0)
})
