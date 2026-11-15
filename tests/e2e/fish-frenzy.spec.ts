import { expect, openApp, test } from './fixtures'

for (const playerCount of [1, 2, 3, 4]) {
  test(`Fish Frenzy isolates catches in the ${playerCount}-player layout`, async ({ page, installMockCamera }) => {
    await page.clock.install()
    await installMockCamera()
    await openApp(page, '#/catalog')
    await page.getByRole('link', { name: 'Play Fish Frenzy' }).click()
    await page.getByRole('button', { name: `${playerCount} ${playerCount === 1 ? 'player' : 'players'}`, exact: true }).click()
    await page.getByRole('button', { name: 'Play without camera' }).click()
    await page.clock.runFor(3100)
    await expect(page.getByRole('group', { name: /Fish Frenzy play area/ })).toHaveCount(playerCount)

    for (let playerId = 1; playerId <= playerCount; playerId++) {
      const board = page.getByRole('group', { name: `Player ${playerId} Fish Frenzy play area` })
      await board.scrollIntoViewIfNeeded()
      const bounds = (await board.boundingBox())!
      const fish = board.locator('.swimming-fish').first()
      const position = await fish.evaluate(element => ({
        x: parseFloat((element as HTMLElement).style.left) / 100,
        y: parseFloat((element as HTMLElement).style.top) / 100,
        value: Number(element.textContent!.replace('+', '')),
      }))
      await page.mouse.move(bounds.x + position.x * bounds.width, bounds.y + position.y * bounds.height)
      await expect(page.getByRole('region', { name: `Player ${playerId}`, exact: true }))
        .toContainText(`${position.value} points · 1 caught · 0 missed`)
      for (let untouched = playerId + 1; untouched <= playerCount; untouched++) {
        await expect(page.getByRole('region', { name: `Player ${untouched}`, exact: true }))
          .toContainText('0 points · 0 caught · 0 missed')
      }
    }
    expect(await page.evaluate(() => (window as typeof window & { __mockMediaState: { requests: number } }).__mockMediaState.requests)).toBe(0)
  })
}

test('Fish Frenzy supports four-player catches, keyboard, pause, results, replay and narrow layout without a camera', async ({ page, installMockCamera }) => {
  await page.clock.install()
  await installMockCamera()
  await openApp(page, '#/camera/fish-frenzy')
  await expect(page.getByRole('heading', { name: 'Fish Frenzy' })).toBeVisible()
  expect(await page.evaluate(() => (window as typeof window & { __mockMediaState: { requests: number } }).__mockMediaState.requests)).toBe(0)
  await page.getByRole('button', { name: '4 players' }).click()
  await page.getByRole('button', { name: 'Play without camera' }).click()
  await expect(page.getByRole('heading', { name: 'Fish Frenzy' })).toBeVisible()
  await page.clock.runFor(3100)
  const board = page.getByRole('group', { name: 'Player 1 Fish Frenzy play area' })
  const bounds = (await board.boundingBox())!
  const fish = page.locator('.fish-player--1 .swimming-fish').first()
  const position = await fish.evaluate(element => ({ x: parseFloat((element as HTMLElement).style.left) / 100, y: parseFloat((element as HTMLElement).style.top) / 100 }))
  await page.mouse.move(bounds.x + position.x * bounds.width, bounds.y + position.y * bounds.height)
  await expect(page.getByRole('status', { name: 'Player 1 fishing feedback' })).toContainText('caught!')
  await expect(page.getByRole('region', { name: 'Player 2', exact: true })).toContainText('0 points · 0 caught')
  await board.focus()
  await page.clock.runFor(10)
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('img', { name: 'Player 1 net' })).toBeVisible()
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const frozenPosition = await page.locator('.swimming-fish').first().getAttribute('style')
  await page.clock.runFor(10000)
  await expect(page.locator('.swimming-fish').first()).toHaveAttribute('style', frozenPosition!)
  await expect(page.getByRole('heading', { name: 'Fishing paused' })).toBeFocused()
  await page.getByRole('button', { name: 'Resume' }).click()
  await page.screenshot({ path: test.info().outputPath('fish-four-players.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(async () => (await board.boundingBox())!.width).toBeCloseTo(390 / 4, 0)
  const arena = (await page.locator('.camera-arena').boundingBox())!
  const controls = (await page.locator('.fish-game .bubble-game__header').boundingBox())!
  const rules = (await page.locator('.fish-rules').boundingBox())!
  expect(controls.y + controls.height).toBeLessThan(arena.y)
  expect(rules.y).toBeGreaterThan(arena.y + arena.height)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  for (const target of await page.locator('.swimming-fish').all()) {
    const area = (await target.locator('..').boundingBox())!
    const label = (await target.locator('span').boundingBox())!
    expect(label.x).toBeGreaterThanOrEqual(area.x)
    expect(label.x + label.width).toBeLessThanOrEqual(area.x + area.width)
    expect(label.y + label.height).toBeLessThanOrEqual(area.y + area.height)
  }
  await page.screenshot({ path: test.info().outputPath('fish-narrow.png'), fullPage: true })
  await page.clock.fastForward(60000)
  await expect(page.getByRole('dialog', { name: 'Fish Frenzy results' })).toContainText('Player 1 wins!')
  await page.getByRole('button', { name: 'Play again' }).click()
  await expect(page.getByText('0 points · 0 caught · 0 missed', { exact: true })).toHaveCount(4)
  await page.getByRole('button', { name: 'Exit game' }).click()
  await expect(page.getByRole('button', { name: 'Play Fish Frenzy' })).toBeEnabled()
})

test('Fish Frenzy requests the camera on activation and offers fallback after denial', async ({ page, installMockCamera }) => {
  await installMockCamera({ denied: true })
  await openApp(page, '#/camera/fish-frenzy')
  await page.getByRole('button', { name: 'Activate camera & play' }).click()
  await expect(page.getByRole('alert')).toContainText('Camera permission is blocked')
  await page.getByRole('button', { name: 'Play without camera' }).click()
  await expect(page.getByRole('heading', { name: 'Fish Frenzy' })).toBeVisible()
})

test('Fish Frenzy camera Play starts immediately without an introduction', async ({ page, installMockCamera }) => {
  await installMockCamera()
  await openApp(page, '#/camera/fish-frenzy')
  await page.getByRole('button', { name: 'Activate camera & play' }).click()
  await expect(page.getByRole('heading', { name: 'Fish Frenzy' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Fish Frenzy', exact: true })).toBeVisible()
})

for (const players of [1, 2, 3, 4]) {
  test(`Fish Frenzy catches through mirrored synthetic camera input with ${players} players`, async ({ page, installMockCamera }) => {
    await installMockCamera({ person: true })
    await page.addInitScript(() => { Math.random = () => .4 })
    await openApp(page, '#/camera/fish-frenzy')
    await page.getByRole('button', { name: `${players} ${players === 1 ? 'player' : 'players'}`, exact: true }).click()
    await page.getByRole('button', { name: 'Activate camera & play' }).click()
    const video = page.getByLabel('Mirrored live camera during gameplay')
    await expect.poll(() => video.evaluate(v => (v as HTMLVideoElement).videoWidth)).toBe(320)
    const board = page.getByRole('group', { name: `Player ${players} Fish Frenzy play area` })
    const fish = board.locator('.swimming-fish').first()
    await expect(fish).toBeVisible()
    const area = (await video.boundingBox())!
    const lane = (await board.boundingBox())!
    expect(lane.x).toBeCloseTo(area.x + (players - 1) * area.width / players, 0)
    expect(lane.width).toBeCloseTo(area.width / players, 0)
    expect(lane.height).toBeCloseTo(area.height, 0)
    expect(await board.evaluate(b => getComputedStyle(b).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
    const alignment = await fish.evaluate(element => {
      const target = element as HTMLElement
      const lane = target.parentElement!.getBoundingClientRect()
      const art = target.querySelector('svg')!.getBoundingClientRect()
      return {
        x: Math.abs(art.x + art.width / 2 - lane.x - parseFloat(target.style.left) / 100 * lane.width),
        y: Math.abs(art.y + art.height / 2 - lane.y - parseFloat(target.style.top) / 100 * lane.height),
      }
    })
    expect(alignment.x).toBeLessThan(1)
    expect(alignment.y).toBeLessThan(1)
    // The painted fixture travels through video capture, MotionProcessor, zone
    // mapping and the generic HAND_POSITION adapter. No pointer event scores.
    await fish.evaluate((element, count) => {
      const target = element as HTMLElement
      const x = 1 - (count - 1 + parseFloat(target.style.left) / 100) / count
      const y = parseFloat(target.style.top) / 100
      const canvas = (window as typeof window & { __cameraFixture: HTMLCanvasElement }).__cameraFixture
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#fff'
      ctx.fillRect((x - .05 / count) * canvas.width, (y - .05) * canvas.height, .1 / count * canvas.width, .1 * canvas.height)
    }, players)
    await expect(page.getByRole('region', { name: `Player ${players}`, exact: true })).toContainText('5 points · 1 caught')
    for (let id = 1; id < players; id++) {
      await expect(page.getByRole('region', { name: `Player ${id}`, exact: true })).toContainText('0 points · 0 caught')
    }
    await expect(page.getByRole('img', { name: `Player ${players} net` })).toHaveCount(0)
    if (players === 1 || players === 4) {
      await page.screenshot({ path: test.info().outputPath(`fish-camera-${players}p.png`) })
    }
  })
}
