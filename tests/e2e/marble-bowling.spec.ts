import {test,expect,openApp,completeReadyGate} from './fixtures'

for(const players of [1,4]){
  test(`Marble Bowling recognizes an upward wrist sweep in the correct lane with ${players} players`,async({page,installMockCamera})=>{
    await installMockCamera({person:true})
    const owner=players-1
    const tracker=`window.createLocalPoseTracker=async()=>({detect:()=>Array.from({length:${players}},(_,i)=>{
      const x=1-(i+.5)/${players},y=i===${owner}&&parent.__bowlUp?.valueOf() ? .40:.74
      const p=Array.from({length:33},()=>({x:0,y:0,visibility:0}))
      p[11]={x:x-.09/${players},y:.43,visibility:1};p[12]={x:x+.09/${players},y:.43,visibility:1}
      p[13]={x,y:.55,visibility:1};p[15]={x,y,visibility:1};return p
    }),close(){}})`
    await openApp(page,'#/catalog',()=>page.route('**/pose/tracker.js',r=>r.fulfill({contentType:'text/javascript',body:tracker})))
    await page.getByRole('button',{name:players===1?'1 player':'4 players',exact:true}).click()
    await page.getByRole('link',{name:'Play Marble Bowling'}).click()
    await expect(page.getByLabel('Marble Bowling movement demonstration')).toBeVisible()
    await completeReadyGate(page)
    await expect(page.locator('.game-tools[data-phase=playing]')).toBeVisible({timeout:9000})
    const boards=page.locator('.bowling-boards [role=group]')
    await expect(boards).toHaveCount(players)
    await page.waitForTimeout(450)
    await page.evaluate(()=>Object.assign(window,{__bowlUp:true}))
    await expect(boards.nth(owner)).toHaveAttribute('data-score','6')
    await expect(boards.nth(owner)).toHaveAttribute('data-rolls','1')
    if(players===4)for(let i=0;i<3;i++)await expect(boards.nth(i)).toHaveAttribute('data-rolls','0')
    await page.screenshot({path:test.info().outputPath('bowling-'+players+'.png')})
    const now=await page.evaluate(()=>performance.now())
    await page.clock.install()
    await page.clock.fastForward(now+34000)
    const results=page.getByRole('dialog',{name:'Marble Bowling results'})
    await expect(results).toContainText('3 pins · 1 strike')
    await results.getByRole('button',{name:/Next level/}).click()
    await expect(page.locator('.arcade-goal')).toContainText('Level 2 · Aim for 4 pts')
    await expect(boards.nth(owner)).toHaveAttribute('data-rolls','0')
  })
}

test('old Mountain links open Bowling, with drag, keyboard, three-roll finish and replay',async({page,installMockCamera})=>{
  await installMockCamera({denied:true})
  await openApp(page,'#/camera/marble-mountain')
  await page.getByRole('button',{name:'1 player',exact:true}).click()
  await page.getByRole('button',{name:'Play without camera'}).click()
  await completeReadyGate(page)
  const lane=page.getByRole('group',{name:'Player 1 Marble Bowling play area'})
  await expect(page.locator('.bowling-game')).toHaveAttribute('data-phase','playing')
  const rect=(await lane.boundingBox())!
  const x=rect.x+rect.width*.5
  await page.mouse.move(x,rect.y+rect.height*.78);await page.mouse.down()
  await page.mouse.move(x,rect.y+rect.height*.48);await page.mouse.up()
  await expect(lane).toHaveAttribute('data-score','6')
  for(let n=2;n<=3;n++){
    await expect(lane.getByText('Roll again ↑')).toBeVisible()
    await lane.press('ArrowRight');await lane.press('Space')
    await expect(lane).toHaveAttribute('data-rolls',String(n))
  }
  const results=page.getByRole('dialog',{name:'Marble Bowling results'})
  await expect(results).toContainText('3/3 rolls')
  await results.getByRole('button',{name:'Play again'}).click()
  await completeReadyGate(page)
  await expect(lane).toHaveAttribute('data-score','0')
})
