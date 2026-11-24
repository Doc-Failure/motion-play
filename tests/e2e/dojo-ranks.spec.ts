import { completeReadyGate, expect, openApp, test } from './fixtures'

test('qualifies through all five dojo ranks, loads each costume and building, and finishes the campaign',async({page,installMockCamera})=>{
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
  for(const [index,rank] of ['leaf','lantern','frost','crane','violet'].entries()){
    await page.clock.runFor(4000)
    await expect(game).toHaveAttribute('data-rank',rank)
    const meter=game.getByRole('meter',{name:'Player 1 health'})
    await expect(meter).toHaveAttribute('aria-valuenow','5')
    const tower=game.locator('.dojo-tower').first()
    await expect(tower).toHaveAttribute('src',new RegExp(rank+'-dojo\\.webp$'))
    await expect.poll(()=>tower.evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    const ninja=game.locator('.dojo-ninja--leap').first()
    await expect(ninja.locator('[data-sprite="leap"]')).toHaveCSS('background-image',new RegExp(rank+'-actions\\.webp'))
    expect(await ninja.evaluate(async(el)=>{
      const img=new Image()
      img.src=getComputedStyle(el.querySelector('[data-sprite]')!).backgroundImage.slice(5,-2)
      await img.decode()
      return img.naturalWidth/img.naturalHeight
    })).toBe(6)
    if(index>0){
      await ninja.evaluate(el=>(el as HTMLButtonElement).click())
      await expect(ninja.locator('[data-sprite="recoil"]')).toBeVisible()
      await expect(ninja.getByLabel(index+' hits remaining')).toBeVisible()
    }
    await page.screenshot({path:test.info().outputPath('dojo-'+rank+'.png')})
    for(let turn=0;turn<145 && !(await results.count());turn++){
      await game.locator('.dojo-ninja--leap:enabled').evaluateAll(nodes=>nodes.forEach(node=>(node as HTMLButtonElement).click()))
      await page.clock.fastForward(280)
    }
    await expect(results).toContainText(`Level ${index+1} complete`)
    if(index<4)await results.getByRole('button',{name:/Next level/}).click()
    else{
      await expect(results).toContainText('All 5 levels complete!')
      await expect(results.getByRole('button',{name:/Next level/})).toHaveCount(0)
    }
  }
})
