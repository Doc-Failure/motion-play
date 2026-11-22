import type { Feet, FloorPoint } from '../../input/LavaFeet'
import type { PlayerCount } from '../../input/PlayerZoneMapper'

// The walkable grass edge in the original 220 × 207 island illustration.
const shore = [
  [3,119], [8,108], [22,99], [40,92], [58,87], [81,83], [105,82],
  [135,84], [155,89], [176,93], [196,101], [208,111], [215,122],
  [211,134], [200,140], [195,148], [183,143], [174,150], [157,152],
  [148,164], [137,161], [129,168], [120,152], [106,156], [93,154],
  [83,160], [72,163], [65,151], [56,151], [51,141], [39,147],
  [31,142], [27,136], [17,139], [14,131], [8,132],
] as const

export function homeZone(players: PlayerCount, side: number) {
  const width = .33 + (players - 1) * .105
  const art = { x: .025 + side / 2 * (.95 - width), y: .48, width, height: .51 }
  const shoreline = shore.map(([x,y]) => ({
    x: art.x + x / 220 * art.width,
    y: art.y + y / 207 * art.height,
  }))
  return { art, shoreline }
}
export type HomeZone = ReturnType<typeof homeZone>

function onIsland({ x, y }: FloorPoint, shoreline: FloorPoint[]) {
  let within = false
  let previous = shoreline[shoreline.length - 1]
  for (const next of shoreline) {
    const dx = next.x - previous.x, dy = next.y - previous.y
    const cross = (x - previous.x) * dy - (y - previous.y) * dx
    if (Math.abs(cross) < 1e-10 &&
        x >= Math.min(previous.x, next.x) && x <= Math.max(previous.x, next.x) &&
        y >= Math.min(previous.y, next.y) && y <= Math.max(previous.y, next.y)) return true
    if ((previous.y > y) !== (next.y > y) && x < previous.x + (y - previous.y) * dx / dy) within = !within
    previous = next
  }
  return within
}

export function inside(feet: Feet, zone: HomeZone) {
  return feet.every(foot => onIsland(foot, zone.shoreline))
}
