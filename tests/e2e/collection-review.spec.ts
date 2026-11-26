import {mkdir,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {catalogGames,isGameVisible} from '../../src/app/catalog'
import {test,expect} from './workshop-fixtures'

const previousGames=[
  {slug:'original-punch',title:'Punch Arena'},
  {slug:'original-keeper',title:'Goalkeeper'},
  {slug:'retired-jam',title:'Paper Jam'}
]
const games=[...catalogGames.filter(g=>g.available),...previousGames]

for(const game of games)test(`collection review / ${game.slug}`,async({page,installMockCamera,workshopOrigin},info)=>{
  test.setTimeout(65000)
  const errors:string[]=[]
  page.on('pageerror',error=>errors.push(error.message))
  const archive=previousGames.some(g=>g.slug===game.slug)
  const two=process.env.MP_REVIEW_PLAYERS==='2',players=two?2:1
  await installMockCamera({person:true})
  if(archive)await page.addInitScript(count=>sessionStorage.setItem('motion-play:players:v1',String(count)),players)
  await page.route('**/pose/tracker.js',r=>r.fulfill({contentType:'text/javascript',body:'window.createLocalPoseTracker=async()=>({detect:()=>[],close:()=>{}})'}))
  const path=archive?`tests/archive.html#${game.slug}`:`#/${isGameVisible(game.slug)?'camera':'workshop'}/${game.slug}`
  await page.goto(new URL(path,workshopOrigin).href)
  if(!archive){
    await page.getByRole('button',{name:two?'2 players':'1 player',exact:true}).click()
    const gate=page.getByRole('group',{name:'Players ready check'})
    await expect(gate).toBeVisible()
    const buttons=gate.getByRole('button',{name:/^Ready Player/})
    await expect(buttons).toHaveCount(players)
    for(const b of await buttons.all()){await expect(b).toBeEnabled();await b.press('Enter')}
    await expect(gate).toHaveCount(0,{timeout:12000})
  }
  await expect(page.locator('.game-tools[data-phase=playing]')).toBeVisible({timeout:12000})
  const surface=page.locator('.camera-arena > section').first()
  await expect(surface).toBeVisible()
  const size=await surface.boundingBox()
  expect(size!.width).toBeGreaterThan(200)
  // Send a moving patch through the actual captured video. Sensors vary by game.
  await page.evaluate(()=>{
    const canvas=(window as typeof window & {__cameraFixture:HTMLCanvasElement}).__cameraFixture
    const ctx=canvas.getContext('2d')!
    let index=0
    const timer=setInterval(()=>{
      ctx.fillStyle=index%2?'#eee':'#222'
      ctx.fillRect(64+index*7,80,16,16)
      if(++index>=10)clearInterval(timer)
    },50)
  })
  const perf=await page.evaluate(async()=>{
    const frames:number[]=[]
    let last=performance.now()
    while(frames.length<30){
      const now=await new Promise<number>(resolve=>requestAnimationFrame(resolve))
      frames.push(now-last);last=now
    }
    const elapsed=frames.reduce((a,b)=>a+b,0)
    frames.sort((a,b)=>a-b)
    return {frames:frames.length,fps:Math.round(1000*frames.length/elapsed),p95Ms:Math.round(frames[28])}
  })
  const output=process.env.MP_REVIEW_OUTPUT??info.outputDir
  await mkdir(output,{recursive:true})
  await page.screenshot({path:resolve(output,`${game.slug}.png`)})
  const baseline=await page.evaluate(()=>performance.now())
  await page.clock.install()
  await page.clock.fastForward(baseline+125000)
  const result=page.locator('[role=dialog]').filter({has:page.getByRole('button',{name:/again|replay|retry/i})})
  await expect(result).toBeVisible({timeout:7000})
  const summary=await result.innerText()
  await result.getByRole('button',{name:/again|replay|retry/i}).click()
  await expect(result).toHaveCount(0)
  if(!archive)await expect(page.getByRole('group',{name:'Players ready check'})).toBeVisible()
  expect(errors).toEqual([])
  const evidence={slug:game.slug,players,archive,perf,summary,runtimeErrors:errors}
  await writeFile(resolve(output,`${game.slug}.json`),JSON.stringify(evidence,null,2))
  console.info('COLLECTION',game.slug,JSON.stringify(perf))
})

test('the second player can shoot a basket with a measured wrist',async({page,installMockCamera,workshopOrigin})=>{
  await installMockCamera({person:true})
  await page.route('**/pose/tracker.js',r=>r.fulfill({contentType:'text/javascript',body:`
    window.createLocalPoseTracker=async()=>({detect:()=>[.25,.75].map((x,seat)=>{
      const joints=Array.from({length:33},()=>({x:0,y:0,visibility:0}))
      joints[11]={x:1-x-.04,y:.45,visibility:1}
      joints[12]={x:1-x+.04,y:.45,visibility:1}
      joints[15]={x:1-x,y:seat&&parent.__raiseWrist?.value?.() ? .48:.8,visibility:1}
      return joints
    }),close:()=>{}})
  `}))
  await page.goto(new URL('#/workshop/basketball-blitz',workshopOrigin).href)
  await page.getByRole('button',{name:'2 players',exact:true}).click()
  const buttons=page.getByRole('button',{name:/^Ready Player/})
  await expect(buttons).toHaveCount(2)
  for(const b of await buttons.all()){await expect(b).toBeEnabled();await b.press('Enter')}
  await expect(page.locator('.game-tools[data-phase=playing]')).toBeVisible({timeout:12000})
  await page.evaluate(()=>{
    const start=performance.now()
    Object.assign(window,{__raiseWrist:{value:()=>performance.now()-start>300}})
  })
  const scores=page.locator('.round-hud__scores dd')
  await expect(scores.nth(1)).toHaveText('2')
  await expect(scores.nth(0)).toHaveText('0')
})

for(const game of previousGames)test(`archived controls qualify and advance / ${game.slug}`,async({page,workshopOrigin})=>{
  test.setTimeout(90000)
  await page.clock.install()
  await page.goto(new URL('tests/archive.html#'+game.slug,workshopOrigin).href)
  await page.locator('.game-tools').waitFor()
  await page.evaluate(()=>{
    window.setInterval(()=>{
      const pad=document.querySelector('.punch-target')
      const direction=pad?.getAttribute('aria-label')?.split(' ')[1]
      if(direction)pad?.closest('.punch-board')?.dispatchEvent(new KeyboardEvent('keydown',{
        bubbles:true,key:'Arrow'+direction[0].toUpperCase()+direction.slice(1)
      }))
      const ball=document.querySelector<HTMLElement>('.keeper-ball'),board=ball?.parentElement
      if(board&&ball){
        const rect=board.getBoundingClientRect()
        board.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,
          clientX:rect.left+rect.width*parseFloat(ball.style.left)/100,clientY:rect.top+rect.height*.78}))
      }
      document.querySelector<HTMLButtonElement>('.beat-speaker--ready')?.click()
    },75)
  })
  // Play the chart and allow every ball to cross the goal line before grading.
  for(let i=0;i<900&&!await page.getByRole('dialog',{name:/results/i}).count();i++)await page.clock.fastForward(100)
  const result=page.getByRole('dialog',{name:/results/i})
  await expect(result).toBeVisible()
  await result.getByRole('button',{name:/Next level/}).click()
  await expect(page.locator('.arcade-goal')).toContainText('Level 2')
})
