import {completeReadyGate,expect,openApp,test} from './fixtures'
import {visibleCatalogGames} from '../../src/app/catalog'

for(const game of visibleCatalogGames)test(`synthetic render cadence: ${game.title}`,async({page,installMockCamera})=>{
 test.setTimeout(40000)
 await installMockCamera({person:true})
 await openApp(page,`#/camera/${game.slug}`,async()=>{
  await page.route('**/pose/tracker.js',route=>route.fulfill({contentType:'text/javascript',body:'window.createLocalPoseTracker=async()=>({detect:()=>[],close:()=>{}})'}))
 })
 await page.getByRole('button',{name:'1 player',exact:true}).click()
 await completeReadyGate(page)
 await page.waitForTimeout(3300)
 await expect(page.getByRole('heading',{name:game.title,exact:true})).toBeVisible()
 const result=await page.evaluate(async()=>{
  const times:number[]=[];let last=performance.now()
  await new Promise<void>(resolve=>{const frame=(now:number)=>{times.push(now-last);last=now;if(times.length===120)resolve();else requestAnimationFrame(frame)};requestAnimationFrame(frame)})
  const elapsed=times.reduce((a,b)=>a+b,0),sorted=[...times].sort((a,b)=>a-b)
  return {fps:1000*times.length/elapsed,p95:sorted[Math.floor(sorted.length*.95)]}
 })
 console.info(`CADENCE ${game.slug} ${JSON.stringify(result)}`)
 expect(result.fps).toBeGreaterThan(10)
})
