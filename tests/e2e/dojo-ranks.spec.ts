import { completeReadyGate, expect, openApp, test } from './fixtures'

for(const players of [1,4])test(`${players} player campaign clears five ninja ranks and defeats Thunder Oni`,async({page,installMockCamera})=>{
  test.setTimeout(95000)
  await page.addInitScript(()=>Object.assign(window,{__testClockInstalled:true}))
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')})
  await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'))
  await installMockCamera({denied:true})
  await openApp(page,'#/camera/ninja-training')
  await page.getByRole('button',{name:players===1?'1 player':'4 players',exact:true}).click()
  await page.getByRole('button',{name:'Play without camera'}).click()
  await completeReadyGate(page)
  const game=page.locator('.dojo-game')
  const results=game.getByRole('dialog',{name:'Paper Dojo results'})
  for(const [index,rank] of ['leaf','lantern','frost','crane','violet','oni'].entries()){
    await page.clock.runFor(3540)
    const approach=game.locator('.dojo-ninja--ready').first()
    await expect(approach.locator('[data-sprite="ready"]')).toHaveCSS('background-image',rank==='frost' ? /frost-poses-[\w-]+\.webp/ : new RegExp(rank+'-actions\\.webp'))
    if (rank === 'frost') {
      const intact = await approach.locator('[data-sprite]').evaluate(async element => {
        const sheet = new Image()
        sheet.src = getComputedStyle(element).backgroundImage.slice(5, -2)
        await sheet.decode()
        const cell = sheet.naturalHeight
        if (sheet.naturalWidth !== 5 * cell) return false
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = cell
        const ctx = canvas.getContext('2d')!
        for (let frame = 0; frame < 5; frame++) {
          ctx.clearRect(0, 0, cell, cell)
          ctx.drawImage(sheet, frame * cell, 0, cell, cell, 0, 0, cell, cell)
          const pixels = ctx.getImageData(0, 0, cell, cell).data
          let ink = 0
          for (let i = 0; i < cell * cell; i++) {
            if (pixels[4 * i + 3] < 100) continue
            const x = i % cell, y = Math.floor(i / cell)
            if (x === 0 || y === 0 || x === cell-1 || y === cell-1) return false
            ink++
          }
          if (ink < cell * cell * .1) return false
        }
        return true
      })
      expect(intact, 'all five Frost Guard poses fit inside individual transparent cells').toBe(true)
    }
    await expect(approach.locator('.dojo-launch-burst')).toHaveCount(0)
    if(index===0)await page.screenshot({path:test.info().outputPath('dojo-smile.png')})
    await page.clock.runFor(460)
    await expect(game).toHaveAttribute('data-rank',rank)
    const meter=game.getByRole('meter',{name:'Player 1 health'})
    await expect(meter).toHaveAttribute('aria-valuenow','5')
    const tower=game.locator('.dojo-tower').first()
    await expect(tower).toHaveAttribute('src',new RegExp((rank==='oni'?'violet':rank)+'-dojo\\.webp$'))
    await expect.poll(()=>tower.evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    const narrowFrost = players === 4 && rank === 'frost'
    const regularSize = page.viewportSize()!
    if (narrowFrost) await page.setViewportSize({width:390,height:844})
    const bases = await game.locator('.dojo-tower').evaluateAll(async towers => Promise.all(towers.map(async element => {
      const image = element as HTMLImageElement
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = 1
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, image.naturalHeight - 1, canvas.width, 1, 0, 0, canvas.width, 1)
      const row = ctx.getImageData(0, 0, canvas.width, 1).data
      return {
        ink: row.some((value, i) => i % 4 === 3 && value >= 100),
        gap: Math.abs(image.getBoundingClientRect().bottom - image.closest('.dojo-game')!.getBoundingClientRect().bottom),
      }
    })))
    for (const base of bases) {
      expect(base.ink).toBe(true)
      expect(base.gap).toBeLessThan(1)
    }
    if (narrowFrost) await page.setViewportSize(regularSize)
    const ninja=game.locator('.dojo-ninja--leap').first()
    await expect(ninja.locator('[data-sprite="leap"]')).toHaveCSS('background-image',new RegExp(rank+'-flight\\.webp'))
    expect(await ninja.evaluate(async(el)=>{
      const img=new Image()
      img.src=getComputedStyle(el.querySelector('[data-sprite]')!).backgroundImage.slice(5,-2)
      await img.decode()
      return img.naturalWidth/img.naturalHeight
    })).toBe(3)
    await expect(ninja.locator('.dojo-launch-burst')).toBeVisible()
    if(index===0)await page.screenshot({path:test.info().outputPath('dojo-launch.png')})
    if(rank==='oni'){
      if(players===4)await page.setViewportSize({width:390,height:844})
      await expect(game.getByRole('button',{name:/Swat Player .* Thunder Oni/})).toHaveCount(players)
      await expect(ninja).toHaveAccessibleName('Swat Player 1 Thunder Oni')
      await page.screenshot({path:test.info().outputPath('thunder-oni-launch.png')})
    }
    if(index>0){
      await ninja.evaluate(el=>(el as HTMLButtonElement).click())
      await expect(ninja.locator('[data-sprite="recoil"]')).toBeVisible()
      const maxHp=rank==='oni'?12:index+1
      await expect(ninja).toHaveAccessibleDescription(`${maxHp-1} of ${maxHp} health remaining`)
      await expect(ninja.locator('.dojo-hp-ring circle')).toHaveAttribute('stroke-dasharray',`${100*(maxHp-1)/maxHp} 100`)
    }
    await page.screenshot({path:test.info().outputPath('dojo-'+rank+'.png')})
    for(let turn=0;turn<145 && !(await results.count());turn++){
      await game.locator('.dojo-ninja--leap:enabled').evaluateAll(nodes=>nodes.forEach(node=>(node as HTMLButtonElement).click()))
      await page.clock.fastForward(280)
    }
    await expect(results).not.toContainText(/bumps?|avoid/i)
    await expect(results).toContainText(`Level ${index+1} complete`)
    if(index<5)await results.getByRole('button',{name:/Next level/}).click()
    else{
      await expect(results.getByRole('heading',{name:'Thunder Oni defeated!'})).toBeVisible()
      await expect(results).toContainText('All 6 levels complete!')
      await expect(results.getByRole('button',{name:/Next level/})).toHaveCount(0)
    }
  }
})
