import {test,expect,openApp,completeReadyGate} from './fixtures'

for(const debug of [false,true])test(`measure a synthetic camera patch through to visible four-player ghost charge (debug ${debug?'on':'off'})`,async({page,installMockCamera})=>{
 test.setTimeout(40000)
 await installMockCamera({person:true})
 await openApp(page,`${debug?'?gameDebug':''}#/camera/ghost-catcher`,async()=>{
  await page.route('**/pose/tracker.js',r=>r.fulfill({contentType:'text/javascript',body:'window.createLocalPoseTracker=async()=>({detect:()=>[],close:()=>{}})'}))
 })
 await page.getByRole('button',{name:'4 players',exact:true}).click()
 await completeReadyGate(page)
 await expect(page.locator('.ghost-game')).toHaveAttribute('data-phase','playing')
 if(debug)await expect(page.getByLabel('Gameplay diagnostics')).toBeVisible()
 const measured=await page.evaluate(async()=>{
  const camera=(window as typeof window&{__cameraFixture:HTMLCanvasElement}).__cameraFixture,ctx=camera.getContext('2d')!
  const board=document.querySelector<HTMLElement>('[data-ghosts]')!
  const ghost=()=>JSON.parse(board.dataset.ghosts!) as {x:number;y:number;charge:number;state:string}[]
  let frame=0
  const patch=()=>{
   const g=ghost().find(g=>g.state==='rising')
   if(!g)return
   ctx.fillStyle=frame++%2?'#fff':'#151515'
   ctx.fillRect((1-g.x/4)*camera.width-9,g.y*camera.height-9,18,18)
  }
  const started=performance.now()
  patch();const timer=setInterval(patch,50)
  const intervals:number[]=[]
  let firstCharge:number|null=null,last=started
  try{
   await new Promise<void>(resolve=>{
    const sample=()=>{
     const now=performance.now()
     intervals.push(now-last);last=now
     if(firstCharge===null&&ghost().some(g=>g.charge>0))firstCharge=now-started
     if(intervals.length>=120||now-started>=5000)resolve()
     else requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
   })
  }finally{clearInterval(timer)}
  const elapsed=last-started
  intervals.sort((a,b)=>a-b)
  return {fps:1000*intervals.length/elapsed,p95Frame:intervals[Math.floor(intervals.length*.95)],firstCharge,frames:intervals.length}
 })
 console.info(`Four-player synthetic patch and rendering (debug ${debug?'on':'off'})`,JSON.stringify(measured))
 expect(measured.firstCharge).not.toBeNull()
 expect(measured.fps).toBeGreaterThan(10)
 await expect(page.locator('.ghost-game header dd').nth(3)).toHaveText('0')
})
