import type {Page} from '@playwright/test'
import {test,expect,completeReadyGate} from './workshop-fixtures'


async function wipe(page:Page){
  const board=page.getByRole('group',{name:'Player 1 Window Wipe play area'})
  // Sweep alternating rows across the glass, then check the visible coverage meter.
  for(let row=0;row<5;row++){
    await board.evaluate((el,row)=>{
      const bounds=el.getBoundingClientRect()
      for(let col=0;col<10;col++){
        const x=(row%2?9-col:col)+.5
        el.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,buttons:1,
          clientX:bounds.left+bounds.width*x/10,clientY:bounds.top+bounds.height*(row+.5)/5}))
      }
    },row)
    await page.clock.runFor(140)
  }
  const coverage=await page.getByLabel('Player 1 window cleaning progress').getAttribute('aria-valuenow')
  expect(Number(coverage)).toBeGreaterThanOrEqual(55)
}
async function box(page:Page){
  const ring=page.getByRole('group',{name:'Player 1 Cardboard Champ play area'})
  // Five deliberate jabs from the accessible controls knock down the first opponent.
  for(let jab=0;jab<5;jab++){
    await page.clock.runFor(320)
    await ring.press('Space')
  }
  await expect(page.locator('.round-hud__scores dd')).toHaveText('110')
}
async function race(page:Page){
  const lane=page.getByRole('group',{name:'Player 1 Kangaroo Race play area'})
  const track=page.locator('.race-track')
  let jumpFor=-1
  for(let tick=0;tick<75;tick++){
    const [racer]=JSON.parse((await track.getAttribute('data-racers'))!) as {distance:number;next:number;obstacle:number;hits:number;cleared:number}[]
    if(racer.distance>=66){
      expect(racer.cleared).toBeGreaterThanOrEqual(3)
      expect(racer.hits).toBe(0)
      return
    }
    const jump=racer.next-racer.distance<3.7&&racer.obstacle!==jumpFor
    if(jump)jumpFor=racer.obstacle
    await lane.press(jump?'ArrowUp':'ArrowDown')
    await page.clock.fastForward(150)
  }
  throw new Error('The simulated racer did not reach the 65 m level goal.')
}
const games=[
  {slug:'window-wipe',title:'Window Wipe',unit:'pts',goal:55,next:73,play:wipe},
  {slug:'punch-arena',title:'Cardboard Champ',unit:'pts',goal:40,next:65,play:box},
  {slug:'kangaroo-race',title:'Kangaroo Race',unit:'m',goal:65,next:80,play:race}
]
for(const game of games)test(`public level qualification / ${game.title}`,async({page,installMockCamera,workshopOrigin})=>{
  test.setTimeout(45000)
  const errors:string[]=[]
  page.on('pageerror',error=>errors.push(error.message))
  await installMockCamera({denied:true})
  await page.addInitScript(()=>{
    Object.assign(window,{__testClockInstalled:true})
  })
  await page.clock.install({time:new Date('2030-02-02T12:00:00Z')})
  await page.clock.pauseAt(new Date('2030-02-02T12:01:00Z'))
  await page.goto(new URL(`#/camera/${game.slug}`,workshopOrigin).href)
  await page.clock.runFor(120)
  await page.getByRole('button',{name:'1 player',exact:true}).click()
  await page.getByRole('button',{name:'Play without camera',exact:true}).press('Enter')
  await completeReadyGate(page)
  await page.clock.runFor(3200)
  const goal=page.locator('.arcade-goal')
  const hud=page.locator('.round-hud__scores dd').first()
  await expect(goal).toHaveText(`Level 1 · Aim for ${game.goal}${game.unit==='m'?'m':' pts'}`)
  const active=page.locator('.game-tools[data-phase=playing]')
  await expect(active).toBeVisible()
  await game.play(page)
  expect(parseInt((await hud.textContent())!,10)).toBeGreaterThanOrEqual(game.goal)
  await page.clock.fastForward(65000)
  const results=page.getByRole('dialog',{name:`${game.title} results`})
  await expect(results.getByText('Level 1 complete')).toBeVisible()
  await results.getByRole('button',{name:/Next level/}).press('Enter')
  await expect(goal).toHaveText(`Level 2 · Aim for ${game.next}${game.unit==='m'?'m':' pts'}`)
  expect(parseInt((await hud.textContent())!,10)).toBe(0)
  await page.clock.runFor(3200)
  await expect(active).toBeVisible()
  await expect(results).toHaveCount(0)
  expect(errors).toEqual([])
})
