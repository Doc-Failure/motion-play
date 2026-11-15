import { expect, openApp, test } from './fixtures'
import { catalogGames } from '../../src/app/catalog'

for (const players of [1, 4]) {
  test(`illustrated game screens support ${players} players`, async ({page, installMockCamera}) => {
    test.setTimeout(120_000)
    await installMockCamera()
    await openApp(page,'#/catalog')
    for(const game of catalogGames.filter(game => game.available)) {
      await page.evaluate(slug => {window.location.hash = `#/camera/${slug}`},game.slug)
      await page.getByRole('button',{name:`${players} ${players === 1 ? 'player' : 'players'}`,exact:true}).click()
      await page.getByRole('button',{name:`Play ${game.title}`,exact:true}).click()
      await page.getByRole('button',{name:'Start round now'}).click()
      await page.waitForTimeout(3300)
      await expect(page.getByRole('heading',{name:game.title,exact:true})).toBeVisible()
      await expect(page.getByRole('button',{name:'Mute game sound'})).toBeVisible()
      await expect(page.locator('.round-track')).toBeVisible()
      await expect(page.locator('.game-curtain')).toHaveCount(0)
      if (game.slug === 'bubble-battle') {
        const bubble = page.locator('.battle-target--bubble').first()
        await expect(bubble).toBeVisible()
        const bounds = await bubble.boundingBox()
        expect(Math.abs(bounds!.width - bounds!.height)).toBeLessThan(2)
      }
      if (['bubble-battle','meteor-smash','whack-a-mole','fruit-catcher','car-wash'].includes(game.slug)) {
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
  await page.getByRole('button',{name:'Play Bubble Battle'}).click()
  await page.getByRole('button',{name:'Start round now'}).click()
  await expect.poll(() => page.evaluate(() => (window as typeof window & {__audioTest:{notes:number}}).__audioTest.notes)).toBeGreaterThan(0)
  await page.getByRole('button',{name:'Mute game sound'}).click()
  const before = await page.evaluate(() => (window as typeof window & {__audioTest:{notes:number}}).__audioTest.notes)
  await page.waitForTimeout(1500)
  expect(await page.evaluate(() => (window as typeof window & {__audioTest:{notes:number}}).__audioTest.notes)).toBe(before)
})
