import { expect, test as base, type Page } from '@playwright/test'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

/* eslint-disable react-hooks/rules-of-hooks -- Playwright names its fixture callback `use`; it is not a React hook. */

type MediaFixture = {
  installMockCamera: (options?: { denied?: boolean }) => Promise<void>
}

export const test = base.extend<MediaFixture>({
  installMockCamera: async ({ page }, use) => {
    await use(async (options = {}) => {
      await page.addInitScript(({ denied }) => {
        const state = { requests: 0, stoppedTracks: 0 }
        Object.defineProperty(window, '__mockMediaState', { value: state })
        const canvas = document.createElement('canvas')
        canvas.width = 64
        canvas.height = 36
        const context = canvas.getContext('2d')
        context!.fillStyle = '#f36f5b'
        context!.fillRect(0, 0, canvas.width, canvas.height)
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
      }, options)
    })
  },
})

export { expect }

export async function openApp(page: Page, hash = '#/camera') {
  const assets = resolve(process.cwd(), 'dist/assets')
  const script = readdirSync(assets).find((file) => file.endsWith('.js'))
  const style = readdirSync(assets).find((file) => file.endsWith('.css'))
  if (!script || !style) throw new Error('Run `npm run build` before the browser tests.')
  await page.goto(`/${hash}`)
}

export async function openCamera(page: Page) {
  await openApp(page)
  await expect(page.getByRole('heading', { name: 'Let’s see your moves' })).toBeVisible()
}
