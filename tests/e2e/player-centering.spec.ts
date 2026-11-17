import {expect,openApp,test} from './fixtures'

test('player choices are centered as a group with centered numbers and labels',async({page,installMockCamera})=>{
 await installMockCamera({person:true})
 await openApp(page,'#/',async()=>{await page.route('**/pose/tracker.js',route=>route.fulfill({contentType:'text/javascript',body:'window.createLocalPoseTracker=async()=>({detect:()=>[],close:()=>{}})'}))})
 await expect(page.locator('body')).toHaveClass(/camera-menu-active/)
 for(const size of [{width:1440,height:900},{width:390,height:844}]){
  await page.setViewportSize(size)
  await page.waitForTimeout(200)
  await page.screenshot({path:test.info().outputPath(`players-${size.width}.png`)})
  const geometry=await page.evaluate(()=>{
   const frame=document.querySelector('.webcam-menu-frame')!.getBoundingClientRect(),row=document.querySelector('.welcome-players')!.getBoundingClientRect()
   const buttons=[...document.querySelectorAll('.welcome-players button')].map(b=>{
    const r=b.getBoundingClientRect(),n=b.querySelector('strong')!.getBoundingClientRect(),label=b.querySelector('span')!.getBoundingClientRect()
    return {x:r.x,y:r.y,width:r.width,height:r.height,numberX:n.x+n.width/2,labelX:label.x+label.width/2,centerY:r.y+r.height/2}
   })
   return {frame:{x:frame.x,y:frame.y,width:frame.width,height:frame.height},row:{x:row.x,y:row.y,width:row.width,height:row.height},buttons}
  })
  expect(Math.abs(geometry.row.x+geometry.row.width/2-geometry.frame.x-geometry.frame.width/2)).toBeLessThan(1)
  const first=geometry.buttons[0],last=geometry.buttons[3]
  expect(Math.abs((first.x+last.x+last.width)/2-geometry.frame.x-geometry.frame.width/2)).toBeLessThan(1)
  for(const b of geometry.buttons){
   expect(b.x).toBeGreaterThanOrEqual(geometry.frame.x)
   expect(b.x+b.width).toBeLessThanOrEqual(geometry.frame.x+geometry.frame.width)
   expect(Math.abs(b.centerY-geometry.row.y-geometry.row.height/2)).toBeLessThan(1)
   expect(Math.abs(b.numberX-b.x-b.width/2)).toBeLessThan(1)
   expect(Math.abs(b.labelX-b.x-b.width/2)).toBeLessThan(1)
  }
 }
})
