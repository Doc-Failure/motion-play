import { isGameVisible } from '../../src/app/catalog'
import { expect, openApp, test } from './fixtures'

for (const [slug, title] of [['window-wipe', 'Window Wipe'], ['whack-a-mole', 'Whack-a-Mole'], ['paint-splash', 'Paint Splash'], ['meteor-smash', 'Meteor Smash'], ['balloon-panic', 'Balloon Panic'], ['gold-rush', 'Gold Rush'], ['simon-says', 'Simon Says'], ['fruit-catcher', 'Fruit Catcher'], ['air-pong', 'Air Pong'], ['goalkeeper', 'Goalkeeper']]) {
  for (const countdown of [false, true]) test(`${title} ${countdown ? 'countdown' : 'gameplay'} freezes camera recovery without losing the round`, async ({page, installMockCamera}) => {
    test.skip(!isGameVisible(slug), 'Hidden while individual games are refined; model and component recovery remains covered.')
    await page.clock.install({time:new Date('2030-01-01T00:00:00Z')})
    await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'))
    await installMockCamera({person:true})
    await openApp(page, `#/camera/${slug}`)
    await page.getByRole('button', {name:`Play ${title}`, exact:true}).click()
    await page.clock.runFor(countdown ? 1000 : 3500)
    const video = page.getByLabel('Mirrored live camera during gameplay')
    await video.evaluate(element => {
      const track = ((element as HTMLVideoElement).srcObject as MediaStream).getVideoTracks()[0]
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException('Permission denied during reconnect', 'NotAllowedError')
      }
      track.stop()
      track.dispatchEvent(new Event('ended'))
    })
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('The camera disconnected')
    const clock = page.locator('.bubble-game__header dl > div').last().locator('dd')
    const time = await clock.textContent()
    const boards = page.locator('[class*="-boards"]').first()
    const frozenBoard = await boards.innerHTML()
    const targets = await page.locator('.mole').count()
    if (slug === 'whack-a-mole' && !countdown) expect(targets).toBeGreaterThan(0)
    await page.getByRole('button', {name:'Reconnect camera'}).click()
    await expect(dialog).toContainText('Camera permission is blocked')
    await page.clock.runFor(10000)
    await expect(clock).toHaveText(time!)
    expect(await boards.innerHTML()).toBe(frozenBoard)
    expect(await page.locator('.mole').count()).toBe(targets)
    await expect(page.getByRole('button', {name:'Resume round'})).toBeDisabled()
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = async () =>
        (window as typeof window & {__cameraFixture:HTMLCanvasElement}).__cameraFixture.captureStream(20)
    })
    await page.getByRole('button', {name:'Reconnect camera'}).click()
    await page.evaluate(() => {
      (window as typeof window & {__cameraFixture:HTMLCanvasElement}).__cameraFixture.getContext('2d')!.fillRect(0,0,1,1)
    })
    await page.clock.runFor(100)
    await expect(page.getByRole('button', {name:'Resume round'})).toBeEnabled()
    await expect(clock).toHaveText(time!)
    await page.getByRole('button', {name:'Resume round'}).click()
    await expect(dialog).toHaveCount(0)
    await page.clock.runFor(countdown ? 3500 : 1000)
    await expect(clock).not.toHaveText(time!)
    if (!countdown) {
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', {configurable:true, value:true})
        document.dispatchEvent(new Event('visibilitychange'))
      })
      await expect(dialog).toContainText('The tab was hidden')
      const tabTime = await clock.textContent()
      const tabBoard = await boards.innerHTML()
      await page.clock.runFor(10000)
      await expect(clock).toHaveText(tabTime!)
      expect(await boards.innerHTML()).toBe(tabBoard)
      await expect(page.getByRole('button', {name:'Resume round'})).toBeDisabled()
      await page.evaluate(() => {
        Reflect.deleteProperty(document, 'hidden')
        document.dispatchEvent(new Event('visibilitychange'))
      })
      await expect(dialog).toBeVisible()
      await page.getByRole('button', {name:'Resume round'}).click()
      await expect(dialog).toHaveCount(0)
    }
  })
}

test('camera disconnect and failed reconnect keep the round frozen until recovery', async ({page,installMockCamera}) => {
  await page.clock.install({time:new Date('2030-01-01T00:00:00Z')})
  await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'))
  await installMockCamera({person:true})
  await openApp(page)
  await page.getByRole('button',{name:'Play Bubble Battle',exact:true}).click()
  const video = page.getByLabel('Mirrored live camera during gameplay')
  await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).videoWidth)).toBe(320)
  await page.clock.runFor(3500)
  await video.evaluate(element => {
    const track = ((element as HTMLVideoElement).srcObject as MediaStream).getVideoTracks()[0]
    let rejectNext = true
    navigator.mediaDevices.getUserMedia = async () => {
      if (rejectNext) {
        rejectNext = false
        throw new DOMException('Permission denied during reconnect', 'NotAllowedError')
      }
      return (window as typeof window & {__cameraFixture:HTMLCanvasElement}).__cameraFixture.captureStream(20)
    }
    track.stop()
    track.dispatchEvent(new Event('ended'))
  })
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('The camera disconnected')
  const time = page.locator('.bubble-game__header dl > div').last().locator('dd')
  const frozenTime = await time.textContent()
  await page.getByRole('button',{name:'Reconnect camera'}).click()
  await expect(dialog).toContainText('Camera permission is blocked')
  await expect(page.getByRole('button',{name:'Resume round'})).toBeDisabled()
  await page.clock.runFor(10000)
  await expect(time).toHaveText(frozenTime!)
  await page.getByRole('button',{name:'Reconnect camera'}).click()
  // The replacement canvas stream needs a fresh frame while the test clock is paused.
  await page.evaluate(() => {
    const canvas = (window as typeof window & {__cameraFixture:HTMLCanvasElement}).__cameraFixture
    canvas.getContext('2d')!.fillRect(0,0,1,1)
  })
  await page.clock.runFor(100)
  await expect(dialog).toHaveCount(0)
  await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).videoWidth)).toBe(320)
  await page.clock.runFor(1000)
  await expect(time).not.toHaveText(frozenTime!)
})

test('shared mirrored camera and overlay lanes stay aligned for one to four players', async ({page,installMockCamera}) => {
  await installMockCamera({person:true})
  await openApp(page)
  for (const players of [1,2,3,4]) {
    await page.getByRole('button',{name:`${players} ${players === 1 ? 'player' : 'players'}`,exact:true}).click()
    await page.getByRole('button',{name:'Play Bubble Battle',exact:true}).click()
    const video = page.getByLabel('Mirrored live camera during gameplay')
    await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).videoWidth)).toBe(320)
    const area = (await video.boundingBox())!
    expect(area.width / area.height).toBeCloseTo(4/3)
    expect(await video.evaluate(v => getComputedStyle(v).opacity)).toBe('1')
    expect(await video.evaluate(v => getComputedStyle(v).transform)).toContain('-1')
    for(let id=1;id<=players;id++) {
      const board = page.getByLabel(`Player ${id} Bubble Battle play area`)
      const box = (await board.boundingBox())!
      expect(box.x).toBeCloseTo(area.x + (id-1) * area.width / players,0)
      expect(box.y).toBeCloseTo(area.y,0)
      expect(box.width).toBeCloseTo(area.width / players,0)
      expect(box.height).toBeCloseTo(area.height,0)
      expect(await board.evaluate(b => getComputedStyle(b).backgroundImage)).toBe('none')
      expect(await board.evaluate(b => getComputedStyle(b).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
    }
    if(players === 1 || players === 4) {
      await page.waitForTimeout(5200)
      await page.screenshot({path:test.info().outputPath(`camera-play-${players}p.png`)})
    }
    await page.getByRole('button',{name:'Exit game',exact:true}).click()
  }
})

test('synthetic camera movement at a visible bubble scores without pointer input',async ({page,installMockCamera}) => {
  await installMockCamera({person:true})
  await page.addInitScript(() => {Math.random = () => .5})
  await openApp(page)
  await page.getByRole('button',{name:'Play Bubble Battle',exact:true}).click()
  await page.waitForTimeout(5500)
  const arena = (await page.locator('.camera-arena').boundingBox())!
  const bubble = (await page.locator('.battle-target--bubble').first().boundingBox())!
  const point = {x:1-(bubble.x + bubble.width/2-arena.x)/arena.width,y:(bubble.y+bubble.height/2-arena.y)/arena.height}
  await page.evaluate(({x,y}) => {
    const canvas = (window as typeof window & {__cameraFixture:HTMLCanvasElement}).__cameraFixture
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'; ctx.fillRect((x-.05)*canvas.width,(y-.05)*canvas.height,canvas.width*.1,canvas.height*.1)
  },point)
  await expect(page.locator('.bubble-game__header dl > div').first().locator('dd')).toHaveText(/^[1-9]\d*$/)
  await expect(page.getByText('Pop! +10',{exact:true})).toBeVisible()
})
