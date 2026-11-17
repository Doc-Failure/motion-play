import { completeReadyGate, expect, openApp, test } from './fixtures'

// Headless macOS needs software WebGL for MediaPipe image preprocessing,
// even though inference itself uses its CPU delegate.
test.use({launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}})

test('minimal intro hides diagnostics while local inference remains private and gameplay omits diagnostic controls',async({page,installMockCamera})=>{
  test.setTimeout(60000)
  const requests:{url:string;method:string}[]=[]
  page.on('request',r=>requests.push({url:r.url(),method:r.method()}))
  await installMockCamera();await openApp(page,'#/camera/window-wipe')
  await page.getByRole('button',{name:'1 player',exact:true}).click()
  await expect(page.getByLabel('Window Wipe movement demonstration')).toBeVisible()
  await expect(page.locator('.body-test')).toBeHidden()
  await expect(page.locator('.body-test__status')).not.toContainText('Loading body tracking',{timeout:40000})
  await expect(page.locator('.body-test__status')).toContainText('No body found')
  await expect(page.locator('.body-test polyline')).toHaveCount(0)
  expect(requests.some(r=>r.url.endsWith('.wasm'))).toBe(true)
  expect(requests.some(r=>r.url.endsWith('.task'))).toBe(true)
  expect(requests.every(r=>r.method==='GET'&&new URL(r.url).origin==='http://motion-play.test')).toBe(true)
  await completeReadyGate(page)
  await expect(page.getByRole('button',{name:/wireframe/i})).toHaveCount(0)
  await expect(page.locator('.body-test')).toBeHidden()
  await expect(page.getByLabel('Mirrored live camera during gameplay')).toBeVisible()
  expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number;stoppedTracks:number}}).__mockMediaState)).toMatchObject({requests:1,stoppedTracks:0})
})

test('fixture joints stay aligned during readiness and gameplay keeps diagnostics hidden',async({page,installMockCamera})=>{
  await installMockCamera({person:true})
  // Deterministic detector fixture verifies UI geometry/lifecycle, not ML accuracy.
  await openApp(page,'#/camera/window-wipe',async()=>{await page.route('**/pose/tracker.js',route=>route.fulfill({contentType:'text/javascript',body:`window.createLocalPoseTracker=async()=>({detect:()=>{const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));p[11]={x:.3,y:.3,visibility:1};p[12]={x:.7,y:.3,visibility:1};p[23]={x:.4,y:.8,visibility:1};p[24]={x:.6,y:.8,visibility:1};return [p]},close:()=>{}})`}))})
  await page.getByRole('button',{name:'1 player',exact:true}).click()
  await expect(page.locator('.body-test polyline')).toHaveCount(5)
  await expect(page.locator('.body-test polyline').first()).toHaveAttribute('points','500,300 500,800')
  const matched=page.getByLabel('Camera frame matched to body tracking')
  await expect(matched).toBeVisible()
  expect(await matched.boundingBox()).toEqual(await page.getByLabel('Mirrored live camera during gameplay').boundingBox())
  // Asymmetric camera pixels mirror with measured joints during the ready check.
  await page.evaluate(()=>{const c=(window as typeof window&{__cameraFixture:HTMLCanvasElement}).__cameraFixture,x=c.getContext('2d')!;x.fillStyle='#ff2020';x.fillRect(0,5,30,30);x.fillStyle='#2040ff';x.fillRect(c.width-30,5,30,30)})
  await expect.poll(()=>matched.evaluate(c=>{const canvas=c as HTMLCanvasElement,x=canvas.getContext('2d')!,left=x.getImageData(5,15,1,1).data,right=x.getImageData(canvas.width-5,15,1,1).data;return left[2]>200&&left[0]<100&&right[0]>200&&right[2]<100})).toBe(true)
  await completeReadyGate(page);await page.waitForTimeout(3300)
  await expect(page.getByRole('button',{name:/wireframe|Align player|Pause/})).toHaveCount(0)
  await expect(page.locator('.body-test')).toBeHidden()
  await expect(matched).toBeHidden()
  await expect(page.locator('iframe[title="Local body tracking runtime"]')).toHaveCount(1)
  await page.getByRole('button',{name:'Exit game',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Game Catalog',level:1})).toBeVisible()
  await expect(page.getByLabel('Mirrored navigation camera')).toBeVisible()
  expect(await page.evaluate(()=>(window as typeof window&{__mockMediaState:{requests:number;stoppedTracks:number}}).__mockMediaState)).toMatchObject({requests:1,stoppedTracks:0})
})
