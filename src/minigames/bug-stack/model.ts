export const WIDTH = 10
export const HEIGHT = 20
const shapes = {
  I: ['....', '####', '....', '....'],
  J: ['#..', '###', '...'],
  L: ['..#', '###', '...'],
  O: ['##', '##'],
  S: ['.##', '##.', '...'],
  T: ['.#.', '###', '...'],
  Z: ['##.', '.##', '...'],
}
export type Kind = keyof typeof shapes
type Cell = Kind | null
interface Piece { kind: Kind; shape: string[]; x: number; y: number }
export interface Stack {
  board: Cell[][]
  piece: Piece
  bag: Kind[]
  seed: number
  lines: number
  score: number
  over: boolean
}
export type Move = 'left' | 'right' | 'rotate' | 'fall' | 'drop' | { column: number }

const emptyRow = (): Cell[] => Array<Cell>(WIDTH).fill(null)
export const shapeOf = (kind: Kind) => shapes[kind]
function spawn(kind: Kind): Piece {
  const shape = shapes[kind]
  return { kind, shape, x: Math.floor((WIDTH - shape.length) / 2), y: kind === 'I' ? -1 : 0 }
}

/** Seeded seven-bag shuffle keeps React reducer replays deterministic. */
function refill(bag: Kind[], seed: number) {
  if (bag.length > 1) return { bag, seed }
  const batch = Object.keys(shapes) as Kind[]
  for (let i = batch.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const j = Math.floor(seed / 2 ** 32 * (i + 1))
    ;[batch[i], batch[j]] = [batch[j], batch[i]]
  }
  return { bag: [...bag, ...batch], seed }
}
export function newStack(seed: number): Stack {
  const deck = refill([], seed)
  return { ...deck, bag: deck.bag.slice(1), board: Array.from({ length: HEIGHT }, emptyRow),
    piece: spawn(deck.bag[0]), score: 0, lines: 0, over: false }
}
export function blocks(piece: Piece) {
  return piece.shape.flatMap((row, dy) => [...row].flatMap((cell, dx) =>
    cell === '#' ? [{ x: piece.x + dx, y: piece.y + dy }] : []))
}
function fits(board: Cell[][], piece: Piece) {
  return blocks(piece).every(({ x, y }) => x >= 0 && x < WIDTH && y < HEIGHT && (y < 0 || board[y][x] === null))
}
export function landing({ board, piece }: Stack) {
  let result = piece
  while (fits(board, { ...result, y: result.y + 1 })) result = { ...result, y: result.y + 1 }
  return result
}
function lock(state: Stack, piece: Piece, bonus: number): Stack {
  const cells = blocks(piece)
  if (cells.some(({ y }) => y < 0)) return { ...state, over: true }
  const board = state.board.map(row => [...row])
  for (const { x, y } of cells) board[y][x] = piece.kind
  const remaining = board.filter(row => row.includes(null))
  const cleared = HEIGHT - remaining.length
  const nextBoard = [...Array.from({ length: cleared }, emptyRow), ...remaining]
  const nextPiece = spawn(state.bag[0])
  return { ...state, ...refill(state.bag.slice(1), state.seed), piece: nextPiece, board: nextBoard,
    lines: state.lines + cleared, score: state.score + bonus + [0, 100, 300, 500, 800][cleared] * level(state),
    over: !fits(nextBoard, nextPiece) }
}
export const level = (state: Stack) => 1 + Math.floor(state.lines / 10)
export function move(state: Stack, action: Move): Stack {
  if (state.over) return state
  let piece = state.piece
  if (action === 'drop') {
    const end = landing(state)
    return lock(state, end, (end.y - piece.y) * 2)
  }
  if (action === 'fall') {
    const next = { ...piece, y: piece.y + 1 }
    return fits(state.board, next) ? { ...state, piece: next } : lock(state, piece, 0)
  }
  if (action === 'rotate') {
    const shape = piece.shape.map((_, x) => piece.shape.map(row => row[x]).reverse().join(''))
    for (const dx of [0, -1, 1, -2, 2]) {
      const next = { ...piece, x: piece.x + dx, shape }
      if (fits(state.board, next)) return { ...state, piece: next }
    }
    return state
  }
  const occupied = blocks(piece).map(cell => cell.x - piece.x)
  const center = Math.floor((Math.min(...occupied) + Math.max(...occupied)) / 2)
  const target = typeof action === 'object' ? Math.round(action.column) - center
    : piece.x + (action === 'left' ? -1 : 1)
  const step = Math.sign(target - piece.x)
  while (piece.x !== target) {
    const next = { ...piece, x: piece.x + step }
    if (!fits(state.board, next)) break
    piece = next
  }
  return piece === state.piece ? state : { ...state, piece }
}
