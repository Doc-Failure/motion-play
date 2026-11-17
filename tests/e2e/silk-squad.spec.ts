import {isGameVisible} from '../../src/app/catalog'
import {completeReadyGate,expect,openApp,test} from './fixtures'
test.skip(!isGameVisible('silk-squad'),'Silk Squad deferred by user')
// Actual local pose tracking uses WebGL preprocessing, CPU inference.
test.use({launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}})
async function setup(page:import('@playwright/test').Page,players=1){
 await openApp(page,'#/camera/silk-squad')
 await page.getByRole('button',{name:`${players} ${players===1?'player':'players'}`,exact:true}).click()
 await page.getByRole('button',{name:'Hide body tracking',exact:true}).click()
 // A measured arm moves only on command; no finger detector is supplied.
 await page.route('**/pose/tracker.js',route=>route.fulfill({contentType:'text/javascript',body:`
 function target(){const e=parent.document.querySelector('.silk-bug--scout')||parent.document.querySelector('.silk-bug');return {x:e?parseFloat(e.style.left)/100:.5,y:e?parseFloat(e.style.top)/100:.4}}
 window.createLocalPoseTracker=async(players,withHands)=>{
  if(withHands)throw new Error('Silk Squad must not request fingers');
  let last=-Infinity,applied=0,pose={x:.5,y:.75};
  return {detect:()=>{
   const now=parent.performance.now(),sequence=parent.__armSequence||0;
   if(sequence!==applied&&now-last<200){pose=sequence%2?target():{x:.5,y:.75};applied=sequence;parent.__appliedArmSequence=sequence;}
   last=now;const x=1-pose.x,p=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));
   p[11]={x:.35,y:.3,visibility:1};p[12]={x:.65,y:.3,visibility:1};
   p[23]={x:.4,y:.7,visibility:1};p[24]={x:.6,y:.7,visibility:1};
   p[13]={x:(.35+x)/2,y:(.3+pose.y)/2,visibility:1};p[15]={x,y:pose.y,visibility:1};p[16].visibility=.1;
   return [p];
  },detectHands:()=>{throw new Error('Finger inference forbidden')},close:()=>{}};
 }
 `}))
 await page.getByRole('button',{name:'Play Silk Squad',exact:true}).click();await completeReadyGate(page)
 await page.waitForTimeout(3300)
}
test('arm movement casts webs without fingers, stillness stops firing, and another wave captures again',async({page,installMockCamera})=>{
 test.setTimeout(45000);await installMockCamera({person:true});await setup(page)
 await expect(page.locator('.silk-aim')).toBeVisible()
 await expect(page.locator('.silk-bug').first()).toHaveCSS('opacity','1')
 await page.evaluate(()=>Object.assign(window,{__armSequence:1}))
 await expect(page.locator('.silk-game header dd').first()).toHaveText('10')
 await expect(page.locator('.silk-cocoon')).toBeVisible()
 await expect(page.locator('.silk-game .score-burst')).toHaveCount(0)
 await page.screenshot({path:test.info().outputPath('silk-gesture-capture.png')})
 await page.waitForTimeout(700);await expect(page.locator('.silk-game header dd').first()).toHaveText('10')
 await page.evaluate(()=>Object.assign(window,{__armSequence:2}))
 await expect.poll(()=>page.evaluate(()=>(window as typeof window&{__appliedArmSequence:number}).__appliedArmSequence)).toBe(2)
 await page.waitForTimeout(700);await expect(page.locator('.silk-bug--scout').first()).toBeVisible()
 await page.evaluate(()=>Object.assign(window,{__armSequence:3}))
 await expect.poll(()=>page.locator('.silk-game header dd').first().textContent()).not.toBe('10')
 await page.getByRole('button',{name:'Pause',exact:true}).click();const before=await page.locator('.silk-game header dd').last().textContent();await page.waitForTimeout(300);await expect(page.locator('.silk-game header dd').last()).toHaveText(before!)
 await page.getByRole('button',{name:'Resume round'}).click()
})
test('keyboard captures support four-player lanes and responsive original art',async({page,installMockCamera})=>{
 test.setTimeout(45000);await installMockCamera({person:true});await setup(page,4)
 const bot=page.getByRole('button',{name:/Catch Player 4 scout bot/}).first()
 await bot.focus();await page.keyboard.press('Enter')
 await expect(page.locator('.silk-game header dd').nth(3)).toHaveText('10')
 for(const viewport of [{width:1280,height:720},{width:390,height:844}]){await page.setViewportSize(viewport);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);await page.screenshot({path:test.info().outputPath(`silk-${viewport.width}.png`)})}
 await expect(page.getByLabel('Mirrored live camera during gameplay')).toBeVisible()
})
test('pose-only tracking loads locally without finger weights or invented arm shots',async({page,installMockCamera})=>{
 test.setTimeout(60000);const requests:{url:string;method:string}[]=[];page.on('request',r=>requests.push({url:r.url(),method:r.method()}))
 await installMockCamera();await openApp(page,'#/camera/silk-squad')
 await page.getByRole('button',{name:'Play Silk Squad',exact:true}).click()
 await expect(page.locator('.silk-game')).toHaveAttribute('data-arm-tracking','ready',{timeout:40000})
 await completeReadyGate(page)
 expect(requests.some(r=>r.url.endsWith('pose_landmarker_lite.task'))).toBe(true)
 expect(requests.some(r=>r.url.endsWith('hand_landmarker.task'))).toBe(false)
 expect(requests.every(r=>r.method==='GET'&&new URL(r.url).origin==='http://motion-play.test')).toBe(true)
 await page.waitForTimeout(3300);await expect(page.locator('.silk-game header dd').first()).toHaveText('0');await expect(page.locator('.silk-aim')).toHaveCount(0)
})
