import {expect, test} from './workshop-fixtures'


const games = [
  {slug: 'keep-ups', title: 'Keep Ups', x: .5, y: .4, travel: .015, goal: 20, next: 30, seconds: 12},
  {slug: 'six-hoops', title: 'Six Hoops', x: .4, y: .4, travel: .015, goal: 10, next: 15, seconds: 12},
  {slug: 'goalkeeper', title: 'Goalkeeper', x: .5, y: .56, travel: .03, goal: 20, next: 30, seconds: 12},
  {slug: 'net-rally', title: 'Net Rally', x: .38, y: .62, travel: .045, goal: 20, next: 30, seconds: 18},
] as const

for (const game of games) test(`${game.title} qualifies through normalized motion and starts level two`, async ({page,workshopOrigin}) => {
  test.setTimeout(90000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.clock.install({time: new Date('2030-01-01T00:00:00Z')})
  await page.clock.pauseAt(new Date('2030-01-01T00:01:00Z'))
  await page.addInitScript(() => {
    let state = 42
    Math.random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296)
  })
  await page.goto(new URL(`tests/sports-levels.html#${game.slug}`,workshopOrigin).href)
  await expect(page.locator('.arcade-goal')).toContainText(`Level 1 · Aim for ${game.goal} pts`)
  // A modest 2.6-second side-to-side lean, sampled at 25 Hz. The keeper extends a forearm.
  // The rally player reacts to the on-screen ball after 160 ms and moves at most .8 court lengths/s.
  const interval = await page.evaluate(({slug, x, y, travel}) => {
    type Ball = {x: number; y: number; vx: number; vy: number}
    const seen: Ball[] = []
    let hand = {x: .32, y: .62}
    let volleyUntil = 0
    const start = performance.now()
    return window.setInterval(() => {
      const now = performance.now()
      const elapsed = now - start - 3450
      if (elapsed < 0) return
      const angle = elapsed * Math.PI / 1300
      const centerX = x + travel * Math.sin(angle)
      const centerY = y + .012 * Math.cos(angle)
      let body = slug === 'goalkeeper'
        ? {pointerId: 'arm', origin: {x: centerX - .11, y: centerY}, x: centerX + .11, y: centerY}
        : {pointerId: 'head', x: centerX, y: centerY}
      if (slug === 'net-rally') {
        const state = document.querySelector('canvas[data-state]')!.getAttribute('data-state')!
        seen.push((JSON.parse(state) as {ball: Ball}).ball)
        if (seen.length <= 4) return
        const ball = seen.shift()!
        let targetX = .3, targetY = .6
        if (ball.x < .52) {
          targetX = Math.max(.07, Math.min(.47, ball.x - .045 + ball.vx * .16))
          targetY = Math.min(.84, Math.max(.36, ball.y + .018 + Math.max(0, ball.vy) * .19))
          if (ball.vy > 0 && ball.y > .3 && ball.y + .15 > hand.y) volleyUntil = now + 160
          if (now < volleyUntil) { targetX += .16; targetY -= .16 }
        }
        const dx = targetX - hand.x, dy = targetY - hand.y
        const step = Math.min(1, .032 / (Math.hypot(dx, dy) || 1))
        hand = {x: hand.x + dx * step, y: hand.y + dy * step}
        body = {pointerId: 'arm', origin: {x: hand.x - .075, y: hand.y - .045}, x: hand.x + .075, y: hand.y + .045}
      }
      window.dispatchEvent(new CustomEvent('sports-fixture-frame', {detail: [
        {...body, kind: 'BODY_MOVE', playerId: 1, confidence: .94, timestamp: now},
      ]}))
    }, 40)
  }, game)
  await page.clock.runFor(game.seconds * 1000)
  await page.evaluate(id => clearInterval(id), interval)
  await page.clock.fastForward(65000)
  const result = page.getByRole('dialog', {name: game.title + ' results'})
  await expect(result).toBeVisible()
  const description = await result.innerText()
  await test.info().attach('native-result', {body: description, contentType: 'text/plain'})
  expect(description).toContain('Level 1 complete')
  expect(Number(description.match(/Player 1: (\d+) points/)?.[1])).toBeGreaterThanOrEqual(game.goal)
  if (game.slug === 'six-hoops') expect(description).toMatch(/[1-9]\d*\/\d+ shots made/)
  if (game.slug === 'goalkeeper') expect(Number(description.match(/(\d+) saves/)?.[1])).toBeGreaterThanOrEqual(2)
  if (game.slug === 'net-rally') expect(description).toMatch(/[2-5] — \d/)
  await result.getByRole('button', {name: /Next level/}).press('Enter')
  await expect(page.locator('.arcade-goal')).toContainText(`Level 2 · Aim for ${game.next} pts`)
  await expect(page.locator('.round-hud__scores dd').first()).toHaveText('0')
  await page.clock.runFor(3100)
  await expect(page.locator('.camera-arena > section')).toHaveAttribute('data-phase', 'playing')
  expect(errors).toEqual([])
})
