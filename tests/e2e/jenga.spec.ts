import { towerBlocks } from '../../src/minigames/jenga/TowerGeometry'
import { completeReadyGate, expect, hideAndRestoreTab, openApp, test } from './fixtures'
import { isGameVisible } from '../../src/app/catalog'

test.beforeEach(() => test.skip(!isGameVisible('jenga'), 'Hidden from public play'))

test('Jenga plays from the catalog with keyboard and pointer, advances levels and replays', async ({page, installMockCamera}) => {
  test.setTimeout(50000)
  await installMockCamera({ denied: true })
  await openApp(page, '#/catalog')
  await page.getByRole('button', { name: '1 player', exact: true }).click()
  await page.getByRole('link', { name: 'Play Jenga', exact: true }).click()
  await page.getByRole('button', { name: 'Play without camera' }).click()
  await expect(page.getByLabel('Jenga movement demonstration')).toBeVisible()
  await completeReadyGate(page)
  const game = page.getByRole('region', {name:'Jenga', exact:true})
  await expect(game).toHaveAttribute('data-phase','playing')
  const block = (name: string) => game.getByRole('button', {name, exact:true})
  await page.screenshot({path:test.info().outputPath('jenga-solo.png')})
  for (const [row, position] of ['middle', 'left', 'right'].entries()) {
    await block(`Pull middle block, row ${row + 1}`).press('Enter')
    if (!row) {
      await hideAndRestoreTab(page)
      await game.getByRole('button', { name:'Resume round' }).click()
    }
    await block(`Place ${position} block, row 7`).getByText('+', {exact:true}).click()
  }
  await block('Pull left block, row 1').press('Space')
  const results = game.getByRole('dialog', {name:'Jenga results'})
  await expect(results).toContainText('3 blocks safely stacked')
  await results.getByRole('button', {name:/Next level/}).click()
  await expect(game).toHaveAttribute('data-phase','playing', {timeout:6500})
  await block('Pull middle block, row 1').press('Enter')
  await block('Place middle block, row 7').getByText('+', {exact:true}).click()
  await block('Pull left block, row 1').press('Space')
  await results.getByRole('button', {name:'Play again'}).click()
  await completeReadyGate(page)
  await expect(block('Pull middle block, row 1')).toBeEnabled({timeout:6500})
  await page.getByRole('button', {name:'Exit game'}).click()
  await expect(page.getByRole('link', {name:'Play Jenga',exact:true})).toBeVisible()
})

test('four-player Jenga accepts a measured pull and restack in the active lane', async ({page,installMockCamera}) => {
  await installMockCamera({person:true})
  const pose = `window.createLocalPoseTracker=async()=>({close(){},detect(){
    return Array.from({length:4},(_,i)=>{
      const x=1-(i+.5)/4, p=Array.from({length:33},()=>({x:0,y:0,visibility:0}))
      p[11]={x:x-.02,y:.38,visibility:1};p[12]={x:x+.02,y:.38,visibility:1}
      const hand=i===0?parent.jengaHand:undefined
      p[15]={x:hand ? 1-hand.x/4 : x, y:hand?.y??.18,visibility:1}
      p[13]={x,y:.52,visibility:1};return p
    })
  }})`
  await openApp(page,'#/camera/jenga',()=>page.route('**/pose/tracker.js',r=>r.fulfill({contentType:'text/javascript',body:pose})))
  await page.getByRole('button',{name:'4 players',exact:true}).click()
  await completeReadyGate(page)
  const game=page.locator('.jenga-game')
  await expect(game).toHaveAttribute('data-phase','playing')
  const aim = (x:number,y:number) => page.evaluate(p=>Object.assign(window,{jengaHand:p}),{x,y})
  const lane = await game.getByRole('group').boundingBox()
  const aspect = lane!.width / lane!.height
  const fullTower = Array.from({length:6},()=>[true,true,true])
  const source = towerBlocks(fullTower,false,aspect).find(b=>b.row===0 && b.column===1)!
  await aim(...source.endCentre)
  await expect(game.getByRole('heading',{name:/P1 · Pull sideways/})).toBeVisible()
  await aim(source.endCentre[0]+.16,source.endCentre[1])
  await expect(game.getByRole('heading',{name:/Choose a top slot/})).toBeVisible()
  fullTower[0][1]=false
  const dest = towerBlocks(fullTower,true,aspect).find(b=>b.row===6 && b.column===1)!
  await aim(...dest.endCentre)
  await expect(game.getByRole('heading',{name:/P2 · Pick a lower block/})).toBeVisible()
  await expect(game.locator('.round-hud__scores dd')).toHaveText(['1','0','0','0'])
  await page.screenshot({path:test.info().outputPath('jenga-four-players.png')})
})
