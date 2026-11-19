import {test,expect,openApp,completeReadyGate} from './fixtures'

import {makeCutout} from '../../src/minigames/shadow-snap/cutout'
import {pictureDeck} from '../../src/minigames/shadow-snap/poses'

for(const players of [1,4]){
  test(`Shadow Snap builds a ${players}-person picture from tracked silhouettes`,async({page,installMockCamera})=>{
    test.setTimeout(65000)
    await page.clock.install()
    await installMockCamera({person:true})
    const shapes:Record<string,number[]>={}
    for(const picture of pictureDeck(players,1))picture.poses.forEach((pose,i)=>{
      const {cells}=makeCutout(pose,i,players,4/3)
      shapes[[i,...pose].join('/')]=Array.from(cells.keys()).filter(k=>cells[k])
    })
    // Replace only the model output. The production tracker downsamples and mirrors the raw masks.
    const vision=`const shapes=${JSON.stringify(shapes)}
    export const FilesetResolver={forVisionTasks:async()=>({})}
    export const HandLandmarker={}
    export const PoseLandmarker={createFromOptions:async(files,options)=>({
      detect(frame,callback){
        const count=options.numPoses
        const landmarks=Array.from({length:count},(_,i)=>{
          const p=Array.from({length:33},()=>({x:0,y:0,visibility:0}))
          const center=1-(i+.5)/count
          p[11]={x:center-.04/count,y:.48,visibility:1}
          p[12]={x:center+.04/count,y:.48,visibility:1}
          return p
        })
        if(!options.outputSegmentationMasks)return {landmarks}
        const segmentationMasks=landmarks.map((_,i)=>{
          const seat=parent.document.querySelectorAll('.snap-parts>div')[i]
          const values=new Float32Array(128*96)
          if(seat&&(i!==count-1||parent.__lastReady)){
            const opening=shapes[[i,seat.dataset.left,seat.dataset.right].join('/')]??[]
            const imperfect=parent.__imperfect && parent.document.querySelector('.snap-game')?.dataset.photos==='0'
            opening.forEach((index,n)=>{
              if(!imperfect||n%4!==0)values[index-index%128+127-index%128]=.95
            })
            if(imperfect)for(let n=0;n<Math.round(opening.length*.18);n++)values[n]=.95
          }
          return {width:128,height:96,getAsFloat32Array:()=>values}
        })
        callback({landmarks,segmentationMasks})
      },close:()=>{}})}
    `
    await openApp(page,'#/catalog',()=>page.route('**/pose/vision_bundle.mjs',r=>r.fulfill({contentType:'text/javascript',body:vision})))
    await page.getByRole('button',{name:players===1?'1 player':'4 players',exact:true}).click()
    await page.getByRole('link',{name:'Play Shadow Snap'}).click()
    await expect(page.getByLabel('Shadow Snap movement demonstration')).toBeVisible()
    await completeReadyGate(page)
    const game=page.locator('.snap-game')
    if(players===1)await expect(game.getByRole('img',{name:'Cardboard wall with full-body pose cutouts'})).toBeVisible()
    await expect(game).toHaveAttribute('data-phase','playing')
    if(players===4)await expect(page.locator('.snap-parts [data-matched=true]')).toHaveCount(3)
    await expect(game).toHaveAttribute('data-photos','0')
    if(players===1){
      // The mock camera has a blue shirt at centre and a slate background at the edges.
      const png=await page.locator('.camera-arena').screenshot()
      const [shirt,wall]=await page.evaluate(async bytes=>{
        const image=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'}))
        const canvas=document.createElement('canvas')
        canvas.width=image.width;canvas.height=image.height
        const ctx=canvas.getContext('2d')!
        ctx.drawImage(image,0,0)
        return [[.5,.45],[.1,.45]].map(([x,y])=>Array.from(ctx.getImageData(x*canvas.width,y*canvas.height,1,1).data))
      },Array.from(png))
      expect(shirt[2]).toBeGreaterThan(shirt[0]+50)
      expect(wall[0]).toBeGreaterThan(wall[2]+50)
    }
    await page.evaluate(count=>Object.assign(window,{__lastReady:true,__imperfect:count===1}),players)
    await expect(game).toHaveAttribute('data-photos','1')
    await expect(game.locator('.round-hud__scores dd')).toHaveText(Array(players).fill(players===1?'18':'20'))
    await page.screenshot({path:test.info().outputPath(`snap-${players}.png`)})
    await expect(game).toHaveAttribute('data-photos','2')
    if(players===4){
      await page.setViewportSize({width:390,height:844})
      const print=page.locator('.snap-print')
      await expect(print).toBeInViewport({ratio:1})
      const printBox=(await print.boundingBox())!,tools=(await game.locator('.game-tools').boundingBox())!
      expect(printBox.y+printBox.height).toBeLessThanOrEqual(tools.y)
      const controls=(await game.locator('.snap-controls').boundingBox())!
      expect(controls.x+controls.width).toBeLessThanOrEqual(tools.x)
      await page.screenshot({path:test.info().outputPath('snap-four-narrow.png')})
    }
    await page.clock.fastForward(40000)
    const results=page.getByRole('dialog',{name:'Shadow Snap results'})
    await expect(results).toBeVisible()
    await results.getByRole('button',{name:/Next level/}).click()
    await expect(game).toHaveAttribute('data-photos','0')
    await expect(page.locator('.arcade-goal')).toContainText('Level 2')
    expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number}}).__mockMediaState.requests)).toBe(1)
  })
}
test('camera-free players build a pose with keyboard controls and replay after a missed goal',async({page,installMockCamera})=>{
  await page.clock.install()
  await installMockCamera({denied:true})
  await openApp(page,'#/camera/shadow-snap')
  await page.getByRole('button',{name:'1 player',exact:true}).click()
  await page.getByRole('button',{name:'Play without camera',exact:true}).click()
  await completeReadyGate(page)
  for(const side of ['left','right']){
    const arm=page.getByRole('button',{name:`Player 1 ${side} arm`})
    await expect(arm).toBeEnabled()
    await arm.press('Enter');await arm.press('Enter')
  }
  await expect(page.locator('.snap-game')).toHaveAttribute('data-photos','1')
  await page.clock.fastForward(40000)
  const results=page.getByRole('dialog',{name:'Shadow Snap results'})
  await expect(results.getByRole('button',{name:/Next level/})).toHaveCount(0)
  await results.getByRole('button',{name:'Play again'}).click()
  await expect(page.getByLabel('Players ready check',{exact:true})).toBeVisible()
  await expect(page.locator('.snap-game')).toHaveAttribute('data-photos','0')
})
