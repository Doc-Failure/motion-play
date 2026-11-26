import { expect, test as base, type Page } from '@playwright/test'
import { HAND_HOLD_MS } from '../../src/input/gestureTiming'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

// A review can use an immutable build copy while another local workflow rebuilds
// dist. Every artifact reader must use this same directory.
export const releaseDirectory = resolve(process.env.MOTION_PLAY_DIST ?? 'dist')

/* eslint-disable react-hooks/rules-of-hooks -- Playwright names its fixture callback `use`; it is not a React hook. */

type MediaFixture = {
  installMockCamera: (options?: { denied?: boolean; person?: boolean }) => Promise<void>
}

const installCamera = ({ denied, person }: { denied?: boolean; person?: boolean }) => {
  const state = { requests: 0, stoppedTracks: 0, audioRequests: 0 }
  Object.defineProperty(window, '__mockMediaState', { configurable: true, value: state })
  const canvas = document.createElement('canvas')
  canvas.width = person ? 320 : 64
  canvas.height = person ? 240 : 36
  const context = canvas.getContext('2d')
  context!.fillStyle = '#f36f5b'
  context!.fillRect(0, 0, canvas.width, canvas.height)
  if (person && context) {
    context.fillStyle = '#607b83'; context.fillRect(0,0,320,240)
    context.fillStyle = '#ddb48a'; context.beginPath(); context.arc(160,63,26,0,Math.PI*2); context.fill()
    context.fillStyle = '#395db6'; context.fillRect(130,92,60,110)
    context.strokeStyle = '#ddb48a'; context.lineWidth = 15
    context.beginPath(); context.moveTo(135,105); context.lineTo(75,65); context.moveTo(185,105); context.lineTo(245,65); context.stroke()
    context.fillStyle = '#26313f'; context.fillRect(132,200,22,40); context.fillRect(168,200,22,40)
  }
  Object.assign(window, {__cameraFixture:canvas})
  const stream = canvas.captureStream(20)
  // A live synthetic camera keeps delivering observations even when the picture
  // is still. Canvas capture only emits frames after drawing to the canvas.
  let frame = 0
  window.setInterval(() => {if(context){context.fillStyle=frame++%2 ? '#000000' : '#ffffff';context.fillRect(0,0,1,1)};(track as CanvasCaptureMediaStreamTrack).requestFrame?.()}, 50)
  const track = stream.getVideoTracks()[0]
  const stop = track.stop.bind(track)
  track.stop = () => { state.stoppedTracks += 1; stop() }
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      enumerateDevices: async () => [{ deviceId: 'motion-fixture-camera', groupId: 'fixture', kind: 'videoinput', label: 'Deterministic motion camera', toJSON: () => ({}) }],
      getUserMedia: async (constraints: MediaStreamConstraints) => {
        state.requests += 1
        if (constraints.audio !== false) state.audioRequests += 1
        if (denied) throw new DOMException('Permission denied by fixture', 'NotAllowedError')
        return stream
      },
    },
  })
}

export const test = base.extend<MediaFixture>({
  installMockCamera: async ({ page }, use) => {
    await use(async (options = {}) => {
      await page.addInitScript(installCamera, options)
      await page.evaluate(installCamera, options)
    })
  },
})

export { expect }

export async function openApp(page: Page, hash = '#/camera', beforeNavigate?:()=>Promise<void>) {
  const assets = resolve(releaseDirectory, 'assets')
  const script = readdirSync(assets).find((file) => file.endsWith('.js'))
  const style = readdirSync(assets).find((file) => file.endsWith('.css'))
  if (!script || !style) throw new Error('Run `npm run build` before the browser tests.')
  await page.route('http://motion-play.test/**', async route => {
    const pathname = new URL(route.request().url()).pathname
    const file = resolve(releaseDirectory, pathname === '/' ? 'index.html' : pathname.slice(1))
    const mime = (file.endsWith('.js') || file.endsWith('.mjs')) ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.avif') ? 'image/avif' : file.endsWith('.webp') ? 'image/webp' : file.endsWith('.mp4') ? 'video/mp4' : file.endsWith('.woff2') ? 'font/woff2' : file.endsWith('.ttf') ? 'font/ttf' : file.endsWith('.webmanifest') ? 'application/manifest+json' : file.endsWith('.json') ? 'application/json' : file.endsWith('.wasm') ? 'application/wasm' : file.endsWith('.task') ? 'application/octet-stream' : 'text/html'
    await route.fulfill({body:readFileSync(file),contentType:file.endsWith('.png') ? 'image/png' : mime})
  })
  await beforeNavigate?.()
  await page.goto(`http://motion-play.test/${hash}`)
}

export async function openCamera(page: Page) {
  await openApp(page)
  await expect(page.getByRole('heading', { name: 'Paper Dojo', exact: true })).toBeVisible()
}


/** Exercise the accessible ready gate before legacy game-specific assertions. */
export async function completeReadyGate(page:Page) {
  const gate=page.getByLabel('Players ready check',{exact:true})
  const virtual=await page.evaluate(()=>(window as typeof window&{__testClockInstalled?:boolean}).__testClockInstalled??false)
  if(virtual)await page.clock.runFor(100)
  await expect(gate).toBeVisible()
  const deadline=Date.now()+25000
  while(await gate.count()){
    const buttons=gate.getByRole('button',{name:/^Ready Player /})
    for(let i=0;i<await buttons.count();i++){
      const b=buttons.nth(i)
      try {
        const state=await b.evaluate(el=>({enabled:!(el as HTMLButtonElement).disabled,pressed:el.getAttribute('aria-pressed')}),undefined,{timeout:3000})
        if(state.enabled&&state.pressed==='false')await b.press('Enter',{timeout:3000})
      }catch(error){if(await gate.count()===0)break;throw error}
    }
    if(virtual)await page.clock.runFor(HAND_HOLD_MS + 150)
    else await gate.waitFor({state:'detached',timeout:1000}).catch(()=>undefined)
    if(Date.now()>deadline)break
  }
  await expect(gate).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Exit game',exact:true,includeHidden:true})).toBeEnabled()
}

/** Exercise automatic recovery now that gameplay has no manual pause control. */
export async function hideAndRestoreTab(page:Page){
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))})
 await expect(page.getByRole('heading',{name:'Round paused',exact:true})).toBeVisible()
 await page.evaluate(()=>{Reflect.deleteProperty(document,'hidden');document.dispatchEvent(new Event('visibilitychange'))})
}
