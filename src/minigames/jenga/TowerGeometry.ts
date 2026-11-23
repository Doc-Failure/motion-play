export interface Slot { row: number; column: number }
type Point = [number, number]
type Face = Point[]

// Look down slightly at the nearest corner. The two horizontal axes recede
// in opposite directions and the long dimension swaps on every layer.
export function towerBlocks(tower: boolean[][], placing: boolean, aspect: number) {
  const width = Math.min(.82, .55 / aspect)
  const height = Math.min(.073, .57 / (tower.length + 1))
  const top = tower.length - (tower[tower.length - 1].every(Boolean) ? 0 : 1)
  const blocks = []
  for (let row = 0; row < Math.max(tower.length, placing ? top + 1 : 0); row++) {
    for (let depth = 2; depth >= 0; depth--) {
      const cross = row % 2 === 1
      const column = cross ? 2 - depth : depth
      const wood = !!tower[row]?.[column]
      if (!wood && !(placing && row === top)) continue
      const project = (u: number, v: number, z: number): Point => [
        .5 + (u - v) * width / 6, .84 - (row + z + (u + v) * .19) * height,
      ]
      const u = cross ? 0 : depth, v = cross ? depth : 0
      const endU = cross ? 3 : u + 1, endV = cross ? v + 1 : 3
      const a = project(u, v, 0), b = project(endU, v, 0), c = project(u, endV, 0)
      const at = project(u, v, 1), bt = project(endU, v, 1), ct = project(u, endV, 1), dt = project(endU, endV, 1)
      const left = [a, at, ct, c], right = [a, b, bt, at], lid = [at, bt, dt, ct]
      const end = cross ? left : right
      blocks.push({ row, column, wood, left, right, lid, cross,
        outline: [a,b,bt,dt,ct,c], endCentre: [(end[0][0] + end[2][0])/2, (end[0][1] + end[2][1])/2] as Point })
    }
  }
  return blocks
}

function inside(x: number, y: number, face: Face) {
  let positive = false, negative = false
  for (let i = 0; i < face.length; i++) {
    const a = face[i], b = face[(i + 1) % face.length]
    const side = (b[0]-a[0])*(y-a[1]) - (b[1]-a[1])*(x-a[0])
    positive ||= side > 1e-9
    negative ||= side < -1e-9
    if (positive && negative) return false
  }
  return true
}
export function blockAt(x: number, y: number, blocks: ReturnType<typeof towerBlocks>) {
  // Reverse the paint order so a hand touches the frontmost visible face.
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (inside(x, y, blocks[i].outline)) return blocks[i]
  }
}
