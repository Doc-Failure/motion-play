import { describe, expect, it } from 'vitest'
import { constrainCameraZone, defaultCameraZones, mapCameraPoint, playerViewports } from '../src/input/PlayerZoneMapper'

describe('PlayerZoneMapper', () => {
  it('creates separate side-by-side camera zones for every supported player count', () => {
    expect(defaultCameraZones(1)).toEqual([{ playerId: 1, x: 0, y: 0, width: 1, height: 1 }])
    expect(defaultCameraZones(2).map(({ x, width }) => [x, width])).toEqual([[0, 0.5], [0.5, 0.5]])
    expect(defaultCameraZones(4).map(({ x, width }) => [x, width])).toEqual([[0, 0.25], [0.25, 0.25], [0.5, 0.25], [0.75, 0.25]])
  })

  it('uses full, side-by-side, and 2 by 2 viewport layouts independently', () => {
    expect(playerViewports(1)).toEqual([{ playerId: 1, x: 0, y: 0, width: 1, height: 1 }])
    expect(playerViewports(2).map(({ x, y, width, height }) => [x, y, width, height])).toEqual([[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]])
    expect(playerViewports(3)).toHaveLength(3)
    expect(playerViewports(3)[2]).toMatchObject({ x: 0, y: 0.5, width: 0.5, height: 0.5 })
    expect(playerViewports(4)[3]).toMatchObject({ x: 0.5, y: 0.5, width: 0.5, height: 0.5 })
  })

  it('maps mirrored raw camera coordinates into player-local coordinates', () => {
    const [leftPlayer, rightPlayer] = defaultCameraZones(2)
    expect(mapCameraPoint({ x: 0.75, y: 0.25 }, leftPlayer)).toEqual({ x: 0.5, y: 0.25 })
    expect(mapCameraPoint({ x: 0.25, y: 0.75 }, rightPlayer)).toEqual({ x: 0.5, y: 0.75 })
    expect(mapCameraPoint({ x: 0.25, y: 0.5 }, leftPlayer)).toBeNull()
  })

  it('maps adjustable subregions, handles edges, and constrains invalid edits', () => {
    const zone = { playerId: 1 as const, x: 0.2, y: 0.1, width: 0.4, height: 0.5 }
    expect(mapCameraPoint({ x: 0.8, y: 0.1 }, zone)).toEqual({ x: 0, y: 0 })
    expect(mapCameraPoint({ x: 0.4, y: 0.6 }, zone)).toEqual({ x: 1, y: 1 })
    const interior = mapCameraPoint({ x: 0.7, y: 0.35 }, zone)
    expect(interior?.x).toBeCloseTo(0.25)
    expect(interior?.y).toBeCloseTo(0.5)
    const constrained = constrainCameraZone({ ...zone, x: 0.9, width: 0.8 })
    expect(constrained.x).toBe(0.9)
    expect(constrained.width).toBeCloseTo(0.1)
  })
})
