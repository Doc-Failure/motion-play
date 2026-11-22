import { describe, expect, it } from 'vitest'
import { isMobileDevice } from '../src/app/mobileDevice'
import { BugStackGestures } from '../src/input/BugStackGestures'
import { blocks, HEIGHT, move, newStack, shapeOf, WIDTH } from '../src/minigames/bug-stack/model'

describe('mobile game entry', () => {
  it.each([
    ['iPhone', 'iPhone', 5, true], ['Linux Android', 'Linux', 5, true],
    ['Macintosh', 'MacIntel', 5, true], ['Macintosh', 'MacIntel', 0, false],
    ['Windows Chrome', 'Win32', 10, false],
  ] as const)('routes %s with %s and %d touch points', (userAgent, platform, maxTouchPoints, result) =>
    expect(isMobileDevice({ userAgent, platform, maxTouchPoints } as Navigator)).toBe(result))
})

describe('Bug Stack', () => {
  it('starts with a complete seven-bag and a playable next piece', () => {
    const state = newStack(54)
    expect(new Set([state.piece.kind, ...state.bag]).size).toBe(7)
    expect(move(state, 'drop').piece.kind).toBe(state.bag[0])
  })
  it('clears four rows, scores them, and advances the level', () => {
    const s = newStack(194)
    s.piece = { kind: 'I', x: 2, y: 0, shape: ['..#.', '..#.', '..#.', '..#.'] }
    s.lines = 8
    for (const row of s.board.slice(-4)) { row.fill('J'); row[4] = null }
    const next = move(s, 'drop')
    expect(next.lines).toBe(12)
    expect(next.score).toBe(800 + (HEIGHT - 4) * 2)
    expect(next.board.flat().every(cell => cell === null)).toBe(true)
  })
  it('steers to both walls and cannot cross an occupied column', () => {
    const s = newStack(1)
    s.piece = { kind: 'O', shape: shapeOf('O'), x: 4, y: 10 }
    s.board[10][8] = 'Z'
    expect(move(s, { column: 9 }).piece.x).toBe(6)
    const left = move(s, { column: 0 })
    expect(left.piece.x).toBe(0)
    left.board[10][8] = null
    expect(Math.max(...blocks(move(left, { column: 9 }).piece).map(p => p.x))).toBe(WIDTH - 1)
    expect(move(s, 'fall').piece.y).toBe(11)
    expect(move(s, 'rotate').piece.shape).toEqual(shapeOf('O'))
  })
  it('reaches game over and freezes the board until restart', () => {
    let s = newStack(123)
    for (let i = 0; i < 40 && !s.over; i++) s = move(s, 'drop')
    expect(s.over).toBe(true)
    expect(move(s, 'left')).toBe(s)
    expect(newStack(234).over).toBe(false)
  })
})

function palm(x: number, y: number, pinched = false) {
  const points = Array.from({ length: 21 }, () => ({ x, y }))
  points[5].x -= .05
  points[17].x += .05
  points[8].x += pinched ? .01 : .09
  return { points, confidence: .9, side: 'Right' }
}
it('steers in mirror coordinates, debounces pinch and drop, and resets after tracking loss', () => {
  const input = new BugStackGestures()
  expect(input.read(palm(.8, .3), 1, 0)?.column).toBe(1)
  expect(input.read(palm(.2, .3, true), 1, 100)).toEqual({ column: 8, rotate: true, drop: false })
  expect(input.read(palm(.2, .3, true), 1, 180)?.rotate).toBe(false)
  expect(input.read(palm(.2, .55), 1, 250)?.drop).toBe(true)
  expect(input.read(palm(.2, .60), 1, 320)?.drop).toBe(false)
  expect(input.read(undefined, 1, 370)).toBeNull()
  expect(input.read(palm(.2, .9, true), 1, 440)).toEqual({ column: 8, rotate: false, drop: false })
})
