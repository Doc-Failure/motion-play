import { completeReadyGate, expect, openApp, test } from './fixtures'
import type {Page} from '@playwright/test'

// These layout tests exercise the real video stream and resize events with a stationary room.
const emptyRoom=(page:Page)=>page.route('**/pose/tracker.js',route=>route.fulfill({contentType:'text/javascript',body:'window.createLocalPoseTracker=async()=>({detect:()=>[],close:()=>{}})'}))

for (const intro of [
  {game:'ninja-training', title:'Paper Dojo', players:4},
  {game:'marble-bowling', title:'Marble Bowling', players:1},
]) test(`${intro.title} has a large preview and reachable ready controls`, async ({page,installMockCamera}) => {
  await installMockCamera({person:true});await openApp(page,`#/camera/${intro.game}`,()=>emptyRoom(page))
  await page.getByRole('button',{name:intro.players===1?'1 player':'4 players',exact:true}).click()
  const video=page.getByLabel('Mirrored live camera during gameplay')
  await expect.poll(()=>video.evaluate(v=>(v as HTMLVideoElement).videoWidth)).toBe(320)
  for(const viewport of [{width:1280,height:720},{width:1440,height:900},{width:390,height:844},{width:844,height:390}]){
    await page.setViewportSize(viewport)
    await expect.poll(async()=>{const r=(await video.boundingBox())!;return Math.abs(r.x+r.width/2-viewport.width/2)+Math.abs(r.y+r.height/2-viewport.height/2)}).toBeLessThan(2)
    const r=(await video.boundingBox())!;expect(r.width/r.height).toBeCloseTo(4/3)
    const preview = page.getByLabel(`${intro.title} movement demonstration`)
    await expect(preview).toBeVisible()
    const clip = (await preview.boundingBox())!
    expect(clip.width).toBeGreaterThan(r.height * .65)
    expect(clip.width / clip.height).toBeCloseTo(16/9, 1)
    const card = (await page.locator('.game-intro-demo').boundingBox())!
    const prompt = (await page.locator('.player-ready-gate__instruction').boundingBox())!
    expect(card.y + card.height).toBeLessThanOrEqual(prompt.y)
    expect(card.x).toBeGreaterThanOrEqual(r.x)
    expect(card.x + card.width).toBeLessThanOrEqual(r.x + r.width + 1)
    await expect(page.getByRole('button',{name:/^Ready Player /})).toHaveCount(intro.players)
    await expect(page.locator('.camera-lobby__players')).toBeHidden()
    await expect(page.getByRole('button',{name:'Pause',exact:true})).toBeHidden()
    expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    await page.screenshot({path:test.info().outputPath(`game-intro-${viewport.width}.png`)})
  }
  await completeReadyGate(page)
  await page.getByRole('button',{name:'Exit game'}).click()
  await expect(page.getByRole('heading',{name:'Game Catalog',level:1})).toBeVisible()
  expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number}}).__mockMediaState.requests)).toBe(1)
})

test('the retained feed resizes from square to wide across catalog and Net Rally readiness',async({page,installMockCamera})=>{
  await page.setViewportSize({width:1280,height:720})
  await installMockCamera({person:true})
  await openApp(page,'#/catalog',()=>emptyRoom(page))
  async function changeCameraFormat(width:number,height:number) {
    await page.evaluate(({width,height})=>{
      const canvas=(window as typeof window & {__cameraFixture:HTMLCanvasElement}).__cameraFixture
      canvas.width=width
      canvas.height=height
      const context=canvas.getContext('2d')!
      context.fillStyle='#527d91'
      context.fillRect(0,0,width,height)
    },{width,height})
  }
  async function expectFrame(label:string,sourceWidth:number,expectedWidth:number) {
    const video=page.getByLabel(label,{exact:true})
    await expect.poll(()=>video.evaluate(el=>(el as HTMLVideoElement).videoWidth)).toBe(sourceWidth)
    await expect.poll(async()=>{
      const box=await video.boundingBox()
      return box && [box.x,box.y,box.width,box.height]
    }).toEqual([(1280-expectedWidth)/2,0,expectedWidth,720])
  }
  await changeCameraFormat(240,240)
  await expectFrame('Mirrored navigation camera',240,720)
  await page.getByRole('link',{name:'Play Net Rally'}).click()
  await page.getByRole('button',{name:'1 player',exact:true}).click()
  await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
  await expectFrame('Mirrored live camera during gameplay',240,720)
  await changeCameraFormat(640,360)
  await expectFrame('Mirrored live camera during gameplay',640,1280)
  const gate=page.getByLabel('Players ready check',{exact:true})
  expect(await gate.boundingBox()).toEqual(await page.getByLabel('Mirrored live camera during gameplay').boundingBox())
  const button=await gate.getByRole('button',{name:'Ready Player 1',exact:true}).boundingBox()
  expect(button!.x+button!.width/2).toBeCloseTo(640,0)
  expect(await page.evaluate(()=>(window as typeof window & {__mockMediaState:{requests:number}}).__mockMediaState.requests)).toBe(1)
})
