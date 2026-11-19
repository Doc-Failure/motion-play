import {completeReadyGate,expect,openApp,test} from './fixtures'
import type {Page} from '@playwright/test'

const games = [
  {slug:'ninja-training', title:'Paper Dojo', board:'.dojo-game', goal:35},
  {slug:'ghost-catcher', title:'Ghost Catcher', board:'.ghost-game', goal:50},
  {slug:'ufo-juggler', title:'UFO Juggler', board:'.ufo-game', goal:50},
] as const

async function playDojo(page:Page) {
  // Activate only rendered attack buttons. Expired ninjas deduct points until the buzzer.
  for(let elapsed=0;elapsed<65_000;elapsed+=500){
    await page.clock.fastForward(500)
    if(await page.getByRole('dialog',{name:'Paper Dojo results'}).count())break
    await page.locator('.dojo-ninja--leap:enabled').evaluateAll(ninjas=>{
      for(const ninja of ninjas)(ninja as HTMLButtonElement).click()
    })
  }
}

async function playCanvas(page:Page,slug:'ghost-catcher'|'ufo-juggler',goal:number) {
  const ghostGame=slug==='ghost-catcher'
  const board=page.getByRole('group',{name:ghostGame?'Player 1 Ghost Catcher play area':'Player 1 UFO Juggler play area'})
  const canvas=board.locator('canvas')
  const bounds=(await canvas.boundingBox())!
  const score=page.locator('.round-hud__scores dd').first()
  for(let sample=0;sample<210&&Number(await score.textContent())<goal;sample++){
    await page.clock.fastForward(70)
    const bodies=JSON.parse((await canvas.getAttribute(ghostGame?'data-ghosts':'data-ships'))!) as {
      x:number;y:number;state:string;spin?:number
    }[]
    // Rub a single ghost through capture, or add spin in bursts and coast while hot.
    const target=bodies.find(t=>ghostGame?t.state==='rising':t.state==='flying'&&t.spin!<.8)
    if(target)await page.mouse.move(bounds.x+target.x*bounds.width+(sample%2?2:-2),bounds.y+target.y*bounds.height)
  }
  expect(Number(await score.textContent())).toBeGreaterThanOrEqual(goal)
  await page.clock.fastForward(61000)
}

for(const game of games)test(`${game.title} qualifies with active controls and starts its next level`,async({page,installMockCamera})=>{
  test.setTimeout(60000)
  const errors:string[]=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.addInitScript(()=>Object.assign(window,{__testClockInstalled:true}))
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')})
  await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'))
  await installMockCamera({denied:true})
  await openApp(page,`#/camera/${game.slug}`)
  await page.getByRole('button',{name:'1 player',exact:true}).click()
  await page.getByRole('button',{name:'Play without camera',exact:true}).click()
  await completeReadyGate(page)
  await page.clock.runFor(3200)
  await expect(page.locator('.arcade-goal')).toContainText('Level 1')
  if(game.slug==='ninja-training')await playDojo(page)
  else await playCanvas(page,game.slug,game.goal)
  const results=page.getByRole('dialog',{name:game.title+' results'})
  await expect(results).toBeVisible()
  await expect(results).toContainText('Level 1 complete')
  const score=page.locator(game.board+' .round-hud__scores dd').first()
  const points=Number(await score.textContent())
  expect(points).toBeGreaterThanOrEqual(game.goal)
  test.info().annotations.push({type:'level-one-score',description:String(points)})
  await test.info().attach('level-one-score',{body:String(points),contentType:'text/plain'})
  await results.getByRole('button',{name:/Next level/}).click()
  await page.clock.runFor(3200)
  await expect(page.locator('.arcade-goal')).toContainText('Level 2')
  await expect(score).toHaveText('0')
  await expect(results).toHaveCount(0)
  await expect(page.locator(game.board)).toHaveAttribute('data-phase','playing')
  expect(errors).toEqual([])
})
