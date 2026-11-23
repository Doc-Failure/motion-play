import { completeReadyGate, expect, openApp, test } from './fixtures'

test('qualifies through all four dojo ranks, loads each costume and building, and finishes the campaign',async({page,installMockCamera})=>{
  test.setTimeout(95000)
  await page.addInitScript(()=>Object.assign(window,{__testClockInstalled:true}))
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')})
  await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'))
  await installMockCamera({denied:true})
  await openApp(page,'#/camera/ninja-training')
  await page.getByRole('button',{name:'1 player',exact:true}).click()
  await page.getByRole('button',{name:'Play without camera'}).click()
  await completeReadyGate(page)
  const game=page.locator('.dojo-game')
  const results=game.getByRole('dialog',{name:'Paper Dojo results'})
  for(const [index,rank] of ['leaf','lantern','frost','crane'].entries()){
    await page.clock.runFor(4000)
    await expect(game).toHaveAttribute('data-rank',rank)
    const meter=game.getByRole('meter',{name:'Player 1 health'})
    await expect(meter).toHaveAttribute('aria-valuenow','5')
    for(const [art,name] of [[game.locator('.dojo-tower').first(),'dojo'],[game.locator('.dojo-ninja--leap img').first(),'leap']] as const){
      await expect(art).toHaveAttribute('src',new RegExp(rank+'-'+name+'\\.webp$'))
      await expect.poll(()=>art.evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    }
    await page.screenshot({path:test.info().outputPath('dojo-'+rank+'.png')})
    for(let turn=0;turn<145 && !(await results.count());turn++){
      await game.locator('.dojo-ninja--leap:enabled').evaluateAll(nodes=>nodes.forEach(node=>(node as HTMLButtonElement).click()))
      await page.clock.fastForward(280)
    }
    await expect(results).toContainText(`Level ${index+1} complete`)
    if(index<3)await results.getByRole('button',{name:/Next level/}).click()
    else{
      await expect(results).toContainText('All 4 levels complete!')
      await expect(results.getByRole('button',{name:/Next level/})).toHaveCount(0)
    }
  }
})
