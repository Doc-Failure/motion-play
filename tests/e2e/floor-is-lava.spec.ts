import { completeReadyGate, expect, hideAndRestoreTab, openApp, test } from './fixtures'

test('four people can share one HOME anywhere in the mirrored camera', async ({page,installMockCamera}) => {
  test.setTimeout(45000)
  await installMockCamera({person:true})
  await openApp(page,'#/camera/floor-is-lava',async()=>{
    await page.route('**/pose/tracker.js',route=>route.fulfill({contentType:'text/javascript',body:`
      window.createLocalPoseTracker=async()=>({close(){},detect(){
        const zone=parent.document.querySelector('[data-home-zone]')
        if(!zone)return []
        return Array.from({length:4},(_,i)=>{
          const x=1-(Number(zone.getAttribute('x'))+Number(zone.getAttribute('width'))*(.2+i*.17))/1000
          const p=Array.from({length:33},()=>({x,y:.42,visibility:1,presence:1}))
          for(const [n,dx,y] of [[11,-.02,.38],[12,.02,.38],[23,-.015,.6],[24,.015,.6],[25,-.02,.72],[26,.02,.72],[27,-.022,.85],[28,.022,.85]])p[n]={x:x+dx,y,visibility:1,presence:1}
          return p
        })
      }})`}))
  })
  await page.getByRole('button',{name:'4 players',exact:true}).click()
  await expect(page.getByLabel('Floor Is Lava movement demonstration')).toBeVisible()
  await completeReadyGate(page)
  const game=page.locator('.lava-game')
  await expect(game).toHaveAttribute('data-phase','playing')
  await expect(game.getByRole('timer')).toContainText('4 of 4 home')
  await page.screenshot({path:test.info().outputPath('lava-warning.png')})
  await expect(game.getByRole('timer')).toContainText('Everyone’s home!',{timeout:7000})
  await expect(game.locator('[data-home-zone]')).toHaveCount(1)
  await page.screenshot({path:test.info().outputPath('lava-flood.png')})
  await hideAndRestoreTab(page)
  const pausedSurface = () => game.locator('.lava-flood').evaluate((el:HTMLCanvasElement) =>
    Array.from(el.getContext('2d')!.getImageData(20,20,8,4).data))
  const pausedPixels=await pausedSurface()
  await page.waitForTimeout(160)
  expect(await pausedSurface()).toEqual(pausedPixels)
  await page.getByRole('button',{name:'Resume round'}).click()
  const baseline=await page.evaluate(()=>performance.now())
  await page.clock.install()
  await page.clock.fastForward(baseline+41000)
  await expect(page.getByRole('dialog',{name:'Floor Is Lava results'})).toContainText('1 of 5 waves')
  await page.getByRole('button',{name:'Play again'}).click()
  await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
})

test('solo simulation can enter HOME by clicking the marked floor',async({page,installMockCamera})=>{
  await installMockCamera({denied:true})
  await openApp(page,'#/camera/floor-is-lava')
  await page.getByRole('button',{name:'1 player',exact:true}).click()
  await page.getByRole('button',{name:'Play without camera'}).click()
  await completeReadyGate(page)
  await expect(page.locator('.lava-game')).toHaveAttribute('data-phase','playing')
  await page.setViewportSize({width:680,height:480})
  await page.locator('[data-home-zone]').click()
  await expect(page.getByRole('timer')).toContainText('1 of 1 home')
  await page.screenshot({path:test.info().outputPath('lava-solo.png')})
  await page.getByRole('button',{name:'Exit game'}).click()
  await expect(page.getByRole('link',{name:'Play Floor Is Lava'})).toBeVisible()
})

for (const reduced of [false,true]) test(`flood fills the viewport with a clear HOME and ${reduced ? 'still' : 'flowing'} lava`, async ({page,installMockCamera}) => {
  await page.setViewportSize(reduced ? {width:600,height:800} : {width:1500,height:700})
  await page.emulateMedia({reducedMotion:reduced ? 'reduce' : 'no-preference'})
  await installMockCamera({denied:true})
  await openApp(page,'#/camera/floor-is-lava')
  await page.getByRole('button',{name:'1 player',exact:true}).click()
  await page.getByRole('button',{name:'Play without camera'}).click()
  await completeReadyGate(page)
  const flood=page.locator('canvas.lava-flood')
  await expect(flood).toBeVisible({timeout:11000})
  const probe = () => flood.evaluate((canvas:HTMLCanvasElement) => {
    const ctx=canvas.getContext('2d')!
    const box=canvas.getBoundingClientRect()
    const home=document.querySelector('[data-home-zone]')!.getBoundingClientRect()
    const middleX=(home.left+home.width/2-box.left)*canvas.width/box.width
    const middleY=(home.top+home.height/2-box.top)*canvas.height/box.height
    const alpha=ctx.getImageData(middleX,middleY,1,1).data[3]
    // elementsFromPoint includes the actual painted layer only if it escapes the camera's overflow clipping.
    canvas.style.pointerEvents='auto'
    const corners=[[2,2],[innerWidth-3,2],[2,innerHeight-3],[innerWidth-3,innerHeight-3]]
    const edges=corners.every(([x,y]) => document.elementsFromPoint(x,y).includes(canvas))
    canvas.style.pointerEvents='none'
    return {alpha,edges, pixels:Array.from(ctx.getImageData(2,2,16,4).data)}
  })
  const before=await probe()
  expect(before.alpha).toBe(0)
  expect(before.edges).toBe(true)
  expect(before.pixels[3]).toBe(255)
  await page.waitForTimeout(250)
  const after=await probe()
  if (reduced) expect(after.pixels).toEqual(before.pixels)
  else expect(after.pixels).not.toEqual(before.pixels)
})
