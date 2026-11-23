import { describe, expect, it } from 'vitest'
import { balanced, JengaRound } from '../src/minigames/jenga/JengaRound'
import { towerBlocks, blockAt } from '../src/minigames/jenga/TowerGeometry'
import { playerHands } from '../src/input/PlayerHands'
import type { StickBody } from '../src/camera/poseTracking'

describe('Jenga', () => {
  it('protects the highest complete row, requires a placement, and rotates through four players', () => {
    const game = new JengaRound(4)
    game.start(0)
    game.move({ row: 0, column: 1 }, 1, 2700)
    expect(game.update(2900).holding).toBe(false)
    for (const id of [1, 2, 3, 4] as const) {
      const protectedRow = id < 4 ? 5 : 6
      game.move({ row: protectedRow, column: 0 }, id, 3010 + id * 10)
      expect(game.update(3010 + id * 10).holding).toBe(false)
      const source = { row: id - 1, column: 1 }
      const now = 3010 + id * 10
      game.move(source, id === 4 ? 1 : 4, now)
      expect(game.update(now).holding).toBe(false)
      game.move(source, id, now)
      expect(game.update(now).holding).toBe(true)
      expect(game.update(now).scores[id - 1].score).toBe(0)
      const dest = { row: id < 4 ? 6 : 7, column: (id % 3) }
      game.move(dest, id, now)
      expect(game.update(now).scores[id - 1].score).toBe(1)
      expect(game.update(now).tower.flat().filter(Boolean)).toHaveLength(18)
    }
    expect(game.update(4000).player).toBe(1)
  })

  it('tests the weight above each support along its own axis', () => {
    expect(balanced([[true, false, true], [false, true, false], [true, true, true]])).toBe(true)
    expect(balanced([[false, false, true], [true, true, true]])).toBe(false)
    expect(balanced([[false, true, false], [true, true, true], [false, false, true]])).toBe(true)
    expect(balanced([[false, true, false], [false, true, false], [false, false, true]])).toBe(false)
  })

  it('ends on an unsafe pull and replays with a full tower and a fresh score', () => {
    const game = new JengaRound(1)
    game.start(0)
    game.move({ row: 0, column: 1 }, 1, 3100)
    game.move({ row: 6, column: 1 }, 1, 3200)
    game.move({ row: 0, column: 0 }, 1, 3300)
    expect(game.update(3400)).toMatchObject({ fallen: true, phase: 'results', scores: [{ score: 1 }] })
    expect(game.start(3500)).toMatchObject({ holding: false, fallen: false, phase: 'countdown', scores: [{ score: 0 }] })
  })

  it('requires a continuous hold and a sideways pull by the same fresh hand; pausing cancels the hold', () => {
    const game = new JengaRound(1)
    const source = towerBlocks(game.start(0).tower, false, 1).find(b => b.row === 0 && b.column === 1)!
    const [cx, cy] = source.endCentre
    const hand = (timestamp: number, x = cx, id = 'left', y = cy, now = timestamp) =>
      game.input([{ kind: 'HAND_POSITION', playerId: 1, pointerId: id, confidence: 1, x, y, timestamp }], 1, now)
    hand(3100); hand(3300); hand(3500)
    expect(game.update(3500).locked).toBe(true)
    hand(3510, .8, 'right')
    expect(game.update(3510).holding).toBe(false)
    hand(3600); hand(3800); hand(4000)
    game.pause(4050); game.resume(5000)
    hand(4000, .8, 'left', .8, 5000)
    expect(game.update(5000).target).toBeUndefined()
    hand(5100); hand(5300); hand(5500); hand(5600, cx + .14)
    expect(game.update(5600).holding).toBe(true)
    const dest = towerBlocks(game.update(5700).tower, true, 1).find(b => b.row === 6 && b.column === 1)!
    for (const time of [5800, 6000, 6200]) hand(time, dest.endCentre[0], 'left', dest.endCentre[1])
    expect(game.update(6200).scores[0].score).toBe(1)
  })

  it('maps the visible end of every alternating block to the same slot at solo and four-player sizes', () => {
    const tower = new JengaRound(1).start(0).tower
    for (const aspect of [16/9, 1/3]) {
      for (const block of towerBlocks(tower, false, aspect)) {
        expect(blockAt(...block.endCentre, towerBlocks(tower, false, aspect))).toMatchObject({ row: block.row, column: block.column })
      }
    }
  })

  it('ends at the deadline with no point for a block still in hand', () => {
    const game = new JengaRound(1, 1)
    game.start(0)
    game.move({ row: 0, column: 1 }, 1, 50999)
    game.move({ row: 6, column: 1 }, 1, 51000)
    expect(game.update(51000)).toMatchObject({ phase: 'results', fallen: false, scores: [{ score: 0 }] })
  })

  it('maps the measured hand into its owner’s lane and rejects ambiguous ownership', () => {
    const body: StickBody = { neck: { x: .8, y: .3 }, hands: [{ x: .75, y: .55 }], wristIds: [15],
      x: .8, headRadius: .1, torso: [], legs: [], arms: [] }
    expect(playerHands([body], 2, 50)).toMatchObject([{ playerId: 2, pointerId: '15', x: .5, y: .55, timestamp: 50 }])
    expect(playerHands([body, body], 2, 50)).toEqual([])
    expect(playerHands([{ ...body, hands: [{ x: .3, y: .5 }] }], 2, 50)).toEqual([])
  })
})
