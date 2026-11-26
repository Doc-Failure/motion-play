import { completeReadyGate, expect, openApp, test } from './fixtures'
import { visibleCatalogGames } from '../../src/app/catalog'

for (const players of [1, 4]) {
  test(`illustrated game screens support ${players} players`, async ({page, installMockCamera}) => {
    test.setTimeout(180_000)
    await installMockCamera()
    if (players === 4) await page.setViewportSize({width: 390, height: 844})
    await openApp(page,'#/catalog')
    for(const game of visibleCatalogGames.filter(game => game.available)) {
      await page.evaluate(slug => {window.location.hash = `#/camera/${slug}`},game.slug)
      await page.getByRole('button',{name:`${players} ${players === 1 ? 'player' : 'players'}`,exact:true}).click()
      await completeReadyGate(page)
      await page.waitForTimeout(3300)
      await expect(page.getByRole('heading',{name:game.title,exact:true})).toBeVisible()
      await expect(page.getByRole('button',{name:'Mute game sound'})).toBeVisible()
      const hud = page.locator('.round-hud')
      await expect(hud).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
      await expect(hud).toHaveCSS('pointer-events', 'none')
      await expect(hud.locator('.round-hud__clock dd')).toHaveText(/^\d+s$/)
      await expect(hud.locator('.round-hud__scores dd').first()).toBeVisible()
      const exit = hud.getByRole('button', {name: 'Exit game', exact: true})
      await expect(exit).toHaveCSS('pointer-events', 'auto')
      await expect(exit).toBeInViewport({ratio: 1})
      expect((await exit.boundingBox())!.width).toBeGreaterThanOrEqual(44)
      await expect(page.locator('.round-track')).toHaveCount(0)
      await expect(page.locator('.game-curtain')).toHaveCount(0)
      if (game.slug === 'bubble-battle') {
        const bubble = page.locator('.battle-target--bubble').first()
        await expect(bubble).toBeVisible()
        const bounds = await bubble.boundingBox()
        expect(Math.abs(bounds!.width - bounds!.height)).toBeLessThan(2)
      }
      if (['bubble-battle','meteor-smash','whack-a-mole','fruit-catcher','car-wash','pizza-maker'].includes(game.slug)) {
        await page.screenshot({path:test.info().outputPath(`${game.slug}-${players}p.png`),fullPage:true})
      }
    }
  })
}

test('real Web Audio schedules notes and mute silences subsequent cues',async ({page,installMockCamera}) => {
  await installMockCamera()
  await page.addInitScript(() => {
    const state = {notes:0, stopped:0}
    Object.assign(window,{__audioTest:state})
    const original = AudioContext.prototype.createOscillator
    AudioContext.prototype.createOscillator = function() {
      const voice = original.call(this), start = voice.start.bind(voice), stop = voice.stop.bind(voice)
      voice.start = (...args) => {state.notes++; start(...args)}
      voice.stop = (...args) => {state.stopped++; stop(...args)}
      return voice
    }
  })
  await openApp(page)
  await page.getByRole('button',{name:'1 player',exact:true}).click();await completeReadyGate(page)
  await expect.poll(() => page.evaluate(() => (window as typeof window & {__audioTest:{notes:number}}).__audioTest.notes)).toBeGreaterThan(0)
  await page.getByRole('button',{name:'Mute game sound'}).click()
  const before = await page.evaluate(() => (window as typeof window & {__audioTest:{notes:number}}).__audioTest.notes)
  await page.waitForTimeout(1500)
  expect(await page.evaluate(() => (window as typeof window & {__audioTest:{notes:number}}).__audioTest.notes)).toBe(before)
})
