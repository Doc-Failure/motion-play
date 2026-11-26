import {isGameVisible} from '../../src/app/catalog'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {expect,openApp,test,releaseDirectory} from './fixtures'

test.skip(!isGameVisible('silk-squad'),'Silk Squad deferred by user')
// Real local runtime/bridge + deterministic SDK results. No physical webcam claim.
async function setup(page:import('@playwright/test').Page,players:number,delay=0){
 await openApp(page,'#/camera/silk-squad')
 await page.getByRole('button',{name:'Hide body tracking',exact:true}).click()
 await page.evaluate(({players,delay})=>Object.assign(window,{__readyHands:Array(players).fill(false),__readyDelay:delay,__handLoads:0}),{players,delay})
 await page.route('**/pose/ready-sdk.mjs',route=>route.fulfill({contentType:'text/javascript',body:`
 export const FilesetResolver={forVisionTasks:async()=>({})};
 export const PoseLandmarker={createFromOptions:async (_files,options)=>({detect:()=>{
  const until=performance.now()+parent.__readyDelay;while(performance.now()<until){}
  return {landmarks:Array.from({length:options.numPoses},(_,i)=>{
   const x=1-(i+.5)/options.numPoses,p=Array.from({length:33},()=>({x,y:.5,visibility:1}));
   p[11]={x:x-.025,y:.27,visibility:1};p[12]={x:x+.025,y:.27,visibility:1};
   p[23]={x:x-.02,y:.65,visibility:1};p[24]={x:x+.02,y:.65,visibility:1};
   p[15]={x,y:parent.__readyHands[i] ? .4 : .75,visibility:1};p[16]={x,y:.75,visibility:1};return p;
  })};},close:()=>{}})};
 export const HandLandmarker={createFromOptions:async()=>{parent.__handLoads++;throw new Error('Finger model must not load')}};
 `}))
 // Use a separate SDK URL so an in-flight lobby import cannot reuse the real SDK.
 await page.route('**/pose/tracker.js',route=>route.fulfill({contentType:'text/javascript',body:readFileSync(resolve(releaseDirectory,'pose/tracker.js'),'utf8').replace('./vision_bundle.mjs','./ready-sdk.mjs')}))
 await page.getByRole('button',{name:players===1?'1 player':players+' players',exact:true}).click()
 await page.getByRole('button',{name:'Play Silk Squad',exact:true}).click()
 await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
}
for(const [players,delay] of [[1,450],[4,0]])test(`Silk Squad starts from ${players} measured wrist targets with ${delay}ms pose latency without loading fingers`,async({page,installMockCamera})=>{
 test.setTimeout(45000)
 await installMockCamera({person:true});await setup(page,players,delay)
 const gate=page.getByLabel('Players ready check',{exact:true})
 await page.evaluate(n=>Object.assign(window,{__readyHands:Array(n).fill(true)}),players)
 for(let i=1;i<=players;i++)await expect(page.getByRole('button',{name:'Ready Player '+i,exact:true})).toHaveAttribute('aria-pressed','true')
 await page.waitForTimeout(1000)
 expect(await page.evaluate(()=>(window as typeof window&{__handLoads:number}).__handLoads)).toBe(0)
 // A measured departure resets the hold, including under slow inference.
 await page.evaluate(()=>{(window as typeof window&{__readyHands:boolean[]}).__readyHands[0]=false})
 await expect(page.getByRole('button',{name:'Ready Player 1',exact:true})).toHaveAttribute('aria-pressed','false')
 const started=await page.evaluate(()=>{(window as typeof window&{__readyHands:boolean[]}).__readyHands[0]=true;return performance.now()})
 await expect(gate).toHaveCount(0,{timeout:14000})
 expect(await page.evaluate(()=>performance.now())-started).toBeGreaterThanOrEqual(2000)
 await expect(page.locator('.silk-game')).toHaveAttribute('data-phase',/countdown|playing/)
 await page.evaluate(()=>Object.assign(window,{__readyDelay:0}))
 await expect(page.locator('.silk-game')).toHaveAttribute('data-arm-tracking','ready')
 await page.waitForTimeout(250)
 expect(await page.evaluate(()=>(window as typeof window&{__handLoads:number}).__handLoads)).toBe(0)
 expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number;stoppedTracks:number}}).__mockMediaState)).toMatchObject({requests:1,stoppedTracks:0})
})
