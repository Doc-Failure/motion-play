import type {Page} from '@playwright/test'
import {test,expect} from './workshop-fixtures'


type FixtureWindow=typeof window & {__cameraFixture:HTMLCanvasElement;__skillWrist?:{x:number;y:number}}
const cameraBackground='#243746'
// Only the landmark detector is substituted. Ownership, mirroring, swipe recognition,
// frame differencing, event dispatch and scoring run through the game itself.
const fixtureTracker=`window.createLocalPoseTracker=async()=>({detect:()=>{
  const wrist=parent.__skillWrist || {x:.5,y:.8}
  const x=1-wrist.x,p=Array.from({length:33},()=>({x:.5,y:.5,visibility:0}))
  p[11]={x:.35,y:.32,visibility:1};p[12]={x:.65,y:.32,visibility:1}
  p[13]={x:(.35+x)/2,y:(.32+wrist.y)/2,visibility:1};p[15]={x,y:wrist.y,visibility:1}
  return [p]
},close(){}})`

async function wrist(page:Page,x:number,y:number) {
  await page.evaluate(point=>{(window as FixtureWindow).__skillWrist=point},{x,y})
  await page.waitForTimeout(170)
}

async function swat(page:Page,x:number,y:number) {
  await page.evaluate(({x,y})=>{
    const c=(window as FixtureWindow).__cameraFixture,ctx=c.getContext('2d')!
    ctx.fillStyle='#fff'
    ctx.fillRect((1-x)*c.width-12,y*c.height-10,24,20)
  },{x,y})
  await page.waitForTimeout(240)
  await page.evaluate(background=>{
    const c=(window as FixtureWindow).__cameraFixture,ctx=c.getContext('2d')!
    ctx.fillStyle=background
    ctx.fillRect(0,0,c.width,c.height)
  },cameraBackground)
  await page.waitForTimeout(260)
}

const expectedScore={'basketball-blitz':2,'simon-says':10,'plate-spinner':10,'magic-duel':20,'rocket-rumble':40,'silk-squad':10}
for(const [slug,score] of Object.entries(expectedScore))test(`skill camera interaction / ${slug}`,async({page,installMockCamera,workshopOrigin})=>{
  test.setTimeout(40000)
  const errors:string[]=[]
  page.on('pageerror',error=>errors.push(error.message))
  await installMockCamera({person:true})
  await page.route('**/pose/tracker.js',r=>r.fulfill({contentType:'text/javascript',body:fixtureTracker}))
  await page.goto(new URL(`#/workshop/${slug}`,workshopOrigin).href)
  await page.getByRole('button',{name:'1 player',exact:true}).click()
  await page.evaluate(background=>{
    const c=(window as FixtureWindow).__cameraFixture,ctx=c.getContext('2d')!
    ctx.fillStyle=background
    ctx.fillRect(0,0,c.width,c.height)
  },cameraBackground)
  const gate=page.getByRole('group',{name:'Players ready check'})
  const ready=gate.getByRole('button',{name:'Ready Player 1',exact:true})
  await expect(ready).toBeEnabled()
  await ready.press('Enter')
  await expect(gate).toBeHidden({timeout:9000})
  await expect(page.locator('.camera-play')).toHaveClass(/game-stage--ready/)
  await expect(page.locator('.game-tools[data-phase=playing]')).toBeVisible({timeout:10000})
  if(slug==='basketball-blitz') {
    await page.waitForTimeout(350)
    await wrist(page,.5,.49)
  }else if(slug==='simon-says'){
    const cue=page.locator('.simon-pad.is-lit')
    const label=await cue.getAttribute('aria-label')
    const pads:Record<string,[number,number]>={'Sun pad':[.25,.28],'Leaf pad':[.75,.28],'Wave pad':[.25,.72],'Berry pad':[.75,.72]}
    await expect(page.getByText(/Your turn — repeat/)).toBeVisible()
    await swat(page,...pads[label!])
  }else if(slug==='plate-spinner'){
    await expect(page.locator('.plate-target--wobble').first()).toBeVisible({timeout:3500})
    await swat(page,.2,.4)
  }else if(slug==='magic-duel'){
    await wrist(page,.25,.30)
    await wrist(page,.5,.7)
    await wrist(page,.75,.3)
  }else if(slug==='rocket-rumble'){
    await expect(page.getByRole('button',{name:/^Tag Sun rocket/}).nth(2)).toBeEnabled()
    await swat(page,.2,.25)
    await swat(page,.8,.43)
    await swat(page,.5,.82)
  }else{
    await expect(page.locator('.silk-aim')).toBeVisible()
    const bug=await page.locator('.silk-bug').first().evaluate(el=>({x:parseFloat((el as HTMLElement).style.left)/100,y:parseFloat((el as HTMLElement).style.top)/100}))
    await wrist(page,bug.x,bug.y)
  }
  await expect(page.locator('.round-hud__scores dd').first()).toHaveText(String(score))
  expect(errors).toEqual([])
})
