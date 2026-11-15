import { expect, test as base, type Page } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

/* eslint-disable react-hooks/rules-of-hooks -- Playwright names its fixture callback `use`; it is not a React hook. */

type MediaFixture = {
  installMockCamera: (options?: { denied?: boolean; person?: boolean }) => Promise<void>
}

const installCamera = ({ denied, person }: { denied?: boolean; person?: boolean }) => {
  const state = { requests: 0, stoppedTracks: 0 }
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
  const track = stream.getVideoTracks()[0]
  const stop = track.stop.bind(track)
  track.stop = () => { state.stoppedTracks += 1; stop() }
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      enumerateDevices: async () => [{ deviceId: 'motion-fixture-camera', groupId: 'fixture', kind: 'videoinput', label: 'Deterministic motion camera', toJSON: () => ({}) }],
      getUserMedia: async () => {
        state.requests += 1
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

export async function openApp(page: Page, hash = '#/camera') {
  const assets = resolve(process.cwd(), 'dist/assets')
  const script = readdirSync(assets).find((file) => file.endsWith('.js'))
  const style = readdirSync(assets).find((file) => file.endsWith('.css'))
  if (!script || !style) throw new Error('Run `npm run build` before the browser tests.')
  await page.route('http://motion-play.test/**', async route => {
    const pathname = new URL(route.request().url()).pathname
    const file = resolve(process.cwd(), 'dist', pathname === '/' ? 'index.html' : pathname.slice(1))
    const mime = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.webp') ? 'image/webp' : 'text/html'
    await route.fulfill({body:readFileSync(file),contentType:mime})
  })
  await page.goto(`http://motion-play.test/${hash}`)
}

export async function openCamera(page: Page) {
  await openApp(page)
  await expect(page.getByRole('heading', { name: 'Bubble Battle', exact: true })).toBeVisible()
}
