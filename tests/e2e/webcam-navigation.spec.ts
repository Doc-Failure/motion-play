import {hideAndRestoreTab} from './fixtures'
import {expect,openApp,test} from './fixtures'
import type {Page} from '@playwright/test'
async function installMenuPose(page:Page){
 await page.route('**/pose/tracker.js',route=>route.fulfill({contentType:'text/javascript',body:`
 window.createLocalPoseTracker=async(players)=>({detect:()=>Array.from({length:players},(_,i)=>{
  const center=(i+.5)/players,x=1-center,p=Array.from({length:33},()=>({x,y:.5,visibility:1}));
  p[0]={x,y:.1,visibility:1};p[11]={x:x-.04/players,y:.3,visibility:1};p[12]={x:x+.04/players,y:.3,visibility:1};
  p[23]={x:x-.03/players,y:.7,visibility:1};p[24]={x:x+.03/players,y:.7,visibility:1};
  // Park inactive hands below catalog cards so screenshot delays cannot select a game.
  let wrist={x:center,y:.95};
  if(parent.__readyAll&&parent.document.querySelector('.player-ready-gate'))wrist={x:center,y:.68};
  else if(i===0){
   const target=parent.__menuAim&&parent.document.querySelector(parent.__menuAim),r=target?.getBoundingClientRect();
   const frame=(parent.document.querySelector('.camera-play .camera-arena')||parent.document.querySelector('.camera-lobby:not([hidden]) .camera-lobby__frame')||parent.document.querySelector('.webcam-menu-frame'))?.getBoundingClientRect();
   wrist=r&&frame?.width?{x:(r.x+r.width/2-frame.x)/frame.width,y:(r.y+r.height/2-frame.y)/frame.height}:{x:.02,y:.85};
  }
  if(parent.__menuJitter&&i===0&&!parent.__readyAll){const f=parent.document.querySelector('.webcam-menu-frame')?.getBoundingClientRect();if(f){wrist.x+=Math.sin(performance.now()/41)*parent.__menuJitter/f.width;wrist.y+=Math.cos(performance.now()/37)*parent.__menuJitter/f.height}}
  for(const id of [15,17,19,21])p[id]={x:1-wrist.x,y:wrist.y,visibility:1};p[16]={x,y:.8,visibility:.1};return p;
 }),close:()=>{}})
 `}))
}
async function choose(page:Page,selector:string){
 await page.evaluate(()=>Object.assign(window,{__menuAim:null}))
 await page.waitForTimeout(250)
 const selection=await page.evaluate(selector=>{
  const target=document.querySelector<HTMLElement>(selector)
  if(!target)throw new Error('Missing webcam choice: '+selector)
  const state=window as typeof window&{__choiceSequence?:number;__clickedSequence?:number;__menuAim?:string;__clickedAt?:number}
  const sequence=(state.__choiceSequence??0)+1;state.__choiceSequence=sequence;state.__clickedSequence=0
  target.addEventListener('click',()=>{state.__clickedSequence=sequence;state.__clickedAt=performance.now()},{once:true})
  state.__menuAim=selector;return {sequence,started:performance.now()}
 },selector)
 // Observe the actual click instead of assuming every camera delivers a frame
 // at a fixed moment. No mouse/keyboard activation is performed here.
 await expect.poll(()=>page.evaluate(()=>(window as typeof window&{__clickedSequence?:number}).__clickedSequence),{timeout:8000,message:'Webcam choice '+selector}).toBe(selection.sequence)
 expect(await page.evaluate(()=>(window as typeof window&{__clickedAt:number}).__clickedAt)-selection.started).toBeGreaterThanOrEqual(2000)
 await page.evaluate(()=>Object.assign(window,{__menuAim:null}));await page.waitForTimeout(400)
}
test('webcam chooses a game, player count, ready, pause, resume, exit and home using one stream',async({page,installMockCamera})=>{
 test.setTimeout(90000)
 await installMockCamera({person:true});await openApp(page,'#/',()=>installMenuPose(page))
 await expect(page.getByRole('heading',{name:'playpop.party'})).toBeVisible()
 await expect(page.getByLabel('Mirrored navigation camera')).toBeVisible()
 await expect(page.locator('.webcam-navigation__hand')).toHaveCount(1)
 await choose(page,'a[href="#/catalog"]');await expect(page.getByRole('heading',{name:'Game Catalog',exact:true,level:1})).toBeVisible()
 await choose(page,'a[href="#/camera/window-wipe"]')
 await choose(page,'.welcome-players button[aria-label="2 players"]')
 await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
 await page.evaluate(()=>Object.assign(window,{__readyAll:true}))
 await expect(page.getByLabel('Players ready check',{exact:true})).toHaveCount(0,{timeout:10000})
 await page.evaluate(()=>Object.assign(window,{__readyAll:false}));await page.waitForTimeout(3300)
 await hideAndRestoreTab(page);await expect(page.getByRole('dialog',{name:'Window Wipe paused'})).toBeVisible()
 await choose(page,'.battle-results button:first-of-type');await expect(page.getByRole('dialog',{name:'Window Wipe paused'})).toHaveCount(0)
 await choose(page,'.round-hud__exit');await expect(page.getByRole('heading',{name:'Game Catalog',exact:true,level:1})).toBeVisible()
 await choose(page,'.catalog-toolbar .back-link');await expect(page.getByRole('heading',{name:'playpop.party'})).toBeVisible()
 expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number;stoppedTracks:number}}).__mockMediaState)).toMatchObject({requests:1,stoppedTracks:0})
 await page.screenshot({path:test.info().outputPath('webcam-home.png')})
})

test('five-game tournament adds points and advances every round with webcam-ready holds',async({page,installMockCamera})=>{
 test.setTimeout(120000)
 await page.clock.install()
 await page.addInitScript(()=>{Math.random=()=>.5})
 await installMockCamera({person:true});await openApp(page,'#/',()=>installMenuPose(page))
 await expect(page.getByRole('heading',{name:'playpop.party'})).toBeVisible()
 await expect(page.locator('.webcam-navigation__hand')).toHaveCount(1)
 await choose(page,'a[href="#/tournament"]')
 await choose(page,'.welcome-players button[aria-label="2 players"]')
 const titles=['Paper Dojo','Window Wipe','Cardboard Champ','Keep Ups','Ghost Catcher']
 for(let round=0;round<titles.length;round++){
  await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
  await page.evaluate(()=>Object.assign(window,{__readyAll:true}))
  await expect(page.getByLabel('Players ready check',{exact:true})).toHaveCount(0,{timeout:10000})
  await page.evaluate(()=>Object.assign(window,{__readyAll:false}));await page.waitForTimeout(3300)
  await expect(page.locator('.tournament-ribbon')).toContainText(`Round ${round+1} of 5: ${titles[round]}`)
  if(round===1){
   // Continuous changing pixels represent a moving arm, rather than a single
   // flash that can fall between decoded camera frames.
   await page.evaluate(()=>{
    const state=window as typeof window&{__cameraFixture:HTMLCanvasElement;__scoreMotion?:number},canvas=state.__cameraFixture,ctx=canvas.getContext('2d')!;let frame=0
    state.__scoreMotion=window.setInterval(()=>{
     ctx.fillStyle=frame++%2?'#fff':'#101827';ctx.fillRect(.18*canvas.width,.42*canvas.height,.14*canvas.width,.16*canvas.height)
    },80)
   })
   await expect.poll(()=>page.locator('.wipe-game header dd').nth(1).textContent()).not.toBe('0')
   await page.evaluate(()=>clearInterval((window as typeof window&{__scoreMotion:number}).__scoreMotion))
  }
  await page.clock.fastForward(64000)
 }
 const results=page.getByRole('dialog',{name:'Tournament results'})
 await expect(results.getByRole('heading',{name:'Player 2 wins!'})).toBeVisible()
 await expect(results.getByRole('listitem').first()).toContainText('Player 2')
 expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number;stoppedTracks:number}}).__mockMediaState)).toMatchObject({requests:1,stoppedTracks:0})
 await page.screenshot({path:test.info().outputPath('tournament-winner.png')})
 await choose(page,'.tournament-results button')
 await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:/^Ready Player /})).toHaveCount(2)
 await choose(page,'.player-ready-gate__tools button')
 await choose(page,'.catalog-toolbar .back-link');await expect(page.getByRole('heading',{name:'playpop.party'})).toBeVisible()
})

test('full-camera menus keep all choices inside the visible frame on a narrow screen',async({page,installMockCamera})=>{
 test.setTimeout(60000);await page.setViewportSize({width:390,height:844})
 await installMockCamera({person:true});await openApp(page,'#/',()=>installMenuPose(page))
 await expect(page.getByRole('heading',{name:'playpop.party'})).toBeVisible()
 await expect(page.locator('.webcam-navigation__hand')).toHaveCount(1)
 await expect(page.locator('body')).toHaveClass(/camera-menu-active/)
 await expect(page.locator('.webcam-navigation__dock')).toHaveCount(0)
 await page.screenshot({path:test.info().outputPath('camera-home-390.png')})
 await choose(page,'.action-card[href="#/catalog"]')
 await expect(page.getByRole('heading',{name:'Game Catalog',level:1})).toBeVisible()
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(250)
  const geometry=await page.evaluate(()=>{
   const frame=document.querySelector('.webcam-menu-frame')!.getBoundingClientRect()
   return {scroll:document.documentElement.scrollHeight<=innerHeight,inside:[...document.querySelectorAll('.game-card,.catalog-toolbar a')].every(element=>{const r=element.getBoundingClientRect();return r.left>=frame.left&&r.right<=frame.right&&r.top>=frame.top&&r.bottom<=frame.bottom})}
  })
  expect(geometry).toEqual({scroll:true,inside:true})
  await page.screenshot({path:test.info().outputPath(`camera-catalog-${viewport.width}.png`)})
 }
 await choose(page,'.catalog-toolbar .back-link')
 await expect(page.getByRole('heading',{name:'playpop.party'})).toBeVisible()
 await choose(page,'a[href="#/tournament"]')
 await choose(page,'.welcome-players button[aria-label="2 players"]')
 await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number}}).__mockMediaState.requests)).toBe(1)
 await page.screenshot({path:test.info().outputPath('webcam-tournament-mobile.png')})
})


test('all visible games show a playing movement demo, only ready buttons, then a bare three-second countdown',async({page,installMockCamera})=>{
 test.setTimeout(140000)
 await installMockCamera({person:true});await openApp(page,'#/',()=>installMenuPose(page))
 await expect(page.getByLabel('Mirrored navigation camera')).toBeVisible()
 const games=[['ninja-training','Paper Dojo'],['window-wipe','Window Wipe'],['punch-arena','Cardboard Champ'],['keep-ups','Keep Ups'],['ghost-catcher','Ghost Catcher'],['ufo-juggler','UFO Juggler'],['six-hoops','Six Hoops'],['goalkeeper','Goalkeeper'],['net-rally','Net Rally'],['kangaroo-race','Kangaroo Race'],['marble-bowling','Marble Bowling'],['shadow-snap','Shadow Snap'],['moon-gate-run','Moon Gate Run']]
 for(const [slug,title] of games){
  await page.getByRole('link',{name:/Game Catalog/}).click()
  await page.getByRole('link',{name:`Play ${title}`,exact:true}).click()
  await page.getByRole('button',{name:'1 player',exact:true}).click()
  const gate=page.getByLabel('Players ready check',{exact:true}),video=gate.getByLabel(`${title} movement demonstration`)
  await expect(gate).toBeVisible();await expect(video).toBeVisible()
  await expect.poll(()=>video.evaluate(v=>(v as HTMLVideoElement).currentTime)).toBeGreaterThan(.15)
  await expect(page.locator('.camera-lobby__players')).toBeHidden()
  await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeHidden()
  await expect(gate.getByRole('button')).toHaveCount(2)
  const geometry=await gate.evaluate(el=>{
   const frame=el.getBoundingClientRect(),demo=el.querySelector('.game-intro-demo')!.getBoundingClientRect(),button=el.querySelector('.player-ready-button')!.getBoundingClientRect()
   return {noScroll:document.documentElement.scrollHeight<=innerHeight,inside:demo.top>=frame.top&&demo.bottom<button.top&&button.bottom<frame.bottom}
  })
  expect(geometry).toEqual({noScroll:true,inside:true})
  if(slug==='ninja-training')await page.screenshot({path:test.info().outputPath('minimal-game-intro.png')})
  const started=await page.evaluate(()=>{Object.assign(window,{__readyAll:true});return performance.now()})
  await expect(gate).toHaveCount(0,{timeout:10000})
  expect(await page.evaluate(()=>performance.now())-started).toBeGreaterThanOrEqual(2000)
  await page.evaluate(()=>Object.assign(window,{__readyAll:false}))
  await expect(page.locator('.game-curtain strong').first()).toHaveText('3')
  await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeHidden()
  if(slug==='ninja-training')await page.screenshot({path:test.info().outputPath('minimal-countdown.png')})
  await expect(page.locator('.game-curtain').first()).toHaveCount(0,{timeout:5000})
  await page.getByRole('button',{name:'Exit game',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Game Catalog',level:1})).toBeVisible()
  await page.getByRole('link',{name:'← Back to Home'}).click()
  await expect(page.getByRole('heading',{name:'playpop.party'})).toBeVisible()
 }
 await page.reload()
 await expect(page.getByRole('heading',{name:'playpop.party'})).toBeVisible()
 await expect(page.getByRole('heading',{name:'How many players?'})).toHaveCount(0)
})


test('small pose tremors keep the pointer steady and select a player button after two seconds',async({page,installMockCamera})=>{
 await installMockCamera({person:true});await openApp(page,'#/camera/window-wipe',()=>installMenuPose(page))
 await expect(page.locator('.webcam-navigation__hand')).toHaveCount(1)
 await page.evaluate(()=>Object.assign(window,{__menuAim:'.welcome-players button[aria-label="4 players"]',__menuJitter:3}))
 await expect(page.locator('.webcam-navigation__hold')).toBeVisible()
 const positions=await page.evaluate(async()=>{
  const samples:{x:number;y:number}[]=[]
  await new Promise<void>(resolve=>{const timer=setInterval(()=>{const p=document.querySelector<HTMLElement>('.webcam-navigation__hand');if(p)samples.push({x:parseFloat(p.style.left)*innerWidth/100,y:parseFloat(p.style.top)*innerHeight/100})},50);setTimeout(()=>{clearInterval(timer);resolve()},1500)})
  return samples
 })
 expect(positions.length).toBeGreaterThan(20)
 expect(Math.max(...positions.map(p=>p.x))-Math.min(...positions.map(p=>p.x))).toBeLessThan(.5)
 expect(Math.max(...positions.map(p=>p.y))-Math.min(...positions.map(p=>p.y))).toBeLessThan(.5)
 await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible({timeout:4000})
 await expect(page.getByRole('button',{name:/^Ready Player /})).toHaveCount(4)
})

for(const count of [2,3,4])test(`first detected hand selects ${count} players without moving away first`,async({page,installMockCamera})=>{
 await installMockCamera({person:true})
 await page.addInitScript(count=>Object.assign(window,{__menuAim:`.welcome-players button[aria-label="${count} players"]`}),count)
 await openApp(page,'#/camera/window-wipe',()=>installMenuPose(page))
 await expect(page.getByRole('heading',{name:'How many players?'})).toBeVisible()
 await expect(page.getByRole('button',{name:/^Ready Player /})).toHaveCount(count,{timeout:12000})
 expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number}}).__mockMediaState.requests)).toBe(1)
})
