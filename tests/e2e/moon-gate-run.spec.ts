import { test, expect, openApp, completeReadyGate } from './fixtures'

test('a measured torso rise jumps and a mirrored camera swat hits the visible ninja', async ({page,installMockCamera}) => {
  await installMockCamera({person:true})
  await openApp(page,'#/catalog',async () => {
    await page.route('**/pose/tracker.js', r=>r.fulfill({contentType:'text/javascript',body:`
      window.createLocalPoseTracker=async()=>({close(){},detect(){
        const rise=parent.document.body.dataset.jumping==='yes'?.10:0;
        const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:0,presence:1}));
        for(const [id,x,y] of [[0,.50,.25],[7,.48,.25],[8,.52,.25],[11,.46,.4],[12,.54,.4],[23,.47,.65],[24,.53,.65]])
          p[id]={x,y:y-rise,visibility:1,presence:1};
        return [p];
      }})`}))
  })
  await page.getByRole('link',{name:'Play Moon Gate Run'}).click()
  await page.getByRole('button',{name:'1 player',exact:true}).click()
  await expect(page.getByLabel('Moon Gate Run movement demonstration')).toBeVisible()
  await completeReadyGate(page)
  const foe=page.getByRole('button',{name:/Swat Player 1 Lantern Runner/}).first()
  await expect(foe).toBeVisible({timeout:8000})
  await page.evaluate(()=>{document.body.dataset.jumping='yes'})
  await expect(page.locator('.gate-runner')).toHaveAttribute('data-airborne','true',{timeout:2000})
  const ninja=(await foe.boundingBox())!
  const video=(await page.getByLabel('Mirrored live camera during gameplay').boundingBox())!
  await page.evaluate(({x,y})=>{
    const canvas=(window as typeof window&{__cameraFixture:HTMLCanvasElement}).__cameraFixture
    const c=canvas.getContext('2d')!
    c.fillStyle='#fff';c.fillRect((x-.05)*canvas.width,(y-.05)*canvas.height,.1*canvas.width,.1*canvas.height)
  },{x:1-(ninja.x+ninja.width/2-video.x)/video.width,y:(ninja.y+ninja.height/2-video.y)/video.height})
  await expect(page.locator('.gate-run header dd').first()).toHaveText('10')
  await page.screenshot({path:test.info().outputPath('trail.png')})
})

test('four runners cross the river, swat Thunder Oni, and replay from the ready gate', async ({page,installMockCamera})=>{
  test.setTimeout(60000)
  await page.setViewportSize({width:930,height:720})
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.addInitScript(()=>Object.assign(window,{__testClockInstalled:true}))
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')})
  await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'))
  await installMockCamera({denied:true})
  await openApp(page,'#/camera/moon-gate-run')
  await page.getByRole('button',{name:'4 players',exact:true}).click()
  await page.getByRole('button',{name:'Play without camera'}).click()
  await completeReadyGate(page)
  await page.clock.fastForward(3900)
  await expect(page.locator('.gate-jump:enabled')).toHaveCount(4)
  await page.getByRole('button',{name:'Jump Player 2'}).focus()
  await page.keyboard.press('Space')
  await page.clock.runFor(90)
  await expect(page.locator('.gate-runner').nth(1)).toHaveAttribute('data-airborne','true')
  await page.setViewportSize({width:390,height:844})
  await expect.poll(()=>page.locator('.gate-jump').evaluateAll(buttons=>buttons.every(b=>{
    const r=b.getBoundingClientRect()
    return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))
  }))).toBe(true)
  await page.screenshot({path:test.info().outputPath('four-player-narrow.png')})
  await page.setViewportSize({width:930,height:720})
  await page.getByRole('button',{name:'Pause',exact:true}).click()
  const remaining=await page.locator('.round-hud__clock dd').textContent()
  await page.clock.fastForward(6000)
  await expect(page.getByRole('dialog',{name:'Moon Gate Run paused'})).toBeVisible()
  await expect(page.locator('.round-hud__clock dd')).toHaveText(remaining!)
  await page.getByRole('button',{name:'Resume round'}).click()
  for(let n=0;n<120;n++){
    if(await page.getByRole('dialog',{name:'Moon Gate Run results'}).count())break
    await page.locator('.gate-foe:enabled').evaluateAll(buttons=>buttons.forEach(b=>(b as HTMLButtonElement).click()))
    if(n===36)await page.screenshot({path:test.info().outputPath('river.png')})
    if(n===101)await page.screenshot({path:test.info().outputPath('boss.png')})
    await page.clock.fastForward(300)
  }
  await expect(page.getByRole('heading',{name:'Moon Gate cleared!'})).toBeVisible()
  await expect(page.locator('.battle-results p').filter({hasText:'Thunder Oni defeated'})).toHaveCount(4)
  await page.getByRole('button',{name:'Play again',exact:true}).click()
  await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
})

test('plays the drawn strides, impact, opening gate and full boss collapse on the round clock',async({page,installMockCamera})=>{
  test.setTimeout(65000)
  await page.emulateMedia({reducedMotion:'no-preference'})
  await page.addInitScript(()=>Object.assign(window,{__testClockInstalled:true}))
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')})
  await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'))
  await installMockCamera({denied:true})
  await openApp(page,'#/camera/moon-gate-run')
  await page.getByRole('button',{name:'1 player',exact:true}).click()
  await page.getByRole('button',{name:'Play without camera'}).click()
  await completeReadyGate(page)
  await page.clock.runFor(3120)
  const runner=page.locator('.gate-runner [data-sheet]').first()
  const frames=new Set<string|null>()
  for(let i=0;i<9;i++){
    frames.add(await runner.getAttribute('data-frame'))
    await page.clock.runFor(80)
  }
  expect(frames.size).toBe(6)
  await expect(runner).toHaveCSS('background-image',/animation\/leaf.webp/)
  await page.locator('.gate-foe:enabled').press('Enter')
  await expect(runner).toHaveAttribute('data-sprite','swat')
  await expect(page.locator('[data-sprite="hit-burst"]')).toBeVisible()
  await page.screenshot({path:test.info().outputPath('drawn-swat.png')})
  const boss=page.locator('.gate-foe[data-boss=true]:enabled')
  for(let n=0;n<125 && !await boss.count();n++){
    await page.locator('.gate-foe:enabled').evaluateAll(nodes=>nodes.forEach(node=>(node as HTMLButtonElement).click()))
    await page.clock.fastForward(260)
  }
  await expect(boss).toBeVisible()
  await expect(page.locator('[data-sprite="gate-closed"]')).toBeVisible()
  for(let n=0;n<7;n++){
    await boss.press('Enter');await page.clock.fastForward(260)
  }
  await boss.press('Enter')
  const collapse=page.locator('.gate-foe [data-sprite="collapse"]')
  await expect(collapse).toHaveAttribute('data-frame','10')
  await page.clock.fastForward(350)
  await expect(collapse).toHaveAttribute('data-frame','12')
  await page.clock.fastForward(400)
  await expect(collapse).toHaveAttribute('data-frame','14')
  await expect(page.locator('[data-sprite="gate-opening"]')).toHaveAttribute('data-frame','3')
  await expect(runner).toHaveAttribute('data-sprite','celebrate')
  await expect(page.getByRole('dialog',{name:'Moon Gate Run results'})).toHaveCount(0)
  await page.screenshot({path:test.info().outputPath('drawn-finale.png')})
  await page.clock.fastForward(650)
  await expect(page.getByRole('heading',{name:'Moon Gate cleared!'})).toBeVisible()
})
