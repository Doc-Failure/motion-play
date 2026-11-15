import { describe, expect, it } from 'vitest'
import { containCameraFrame } from '../src/game/cameraGeometry'
import { defaultCameraZones, mapCameraPoint } from '../src/input/PlayerZoneMapper'

describe('shared camera geometry', () => {
  it('letterboxes without cropping in wide and tall windows', () => {
    expect(containCameraFrame(1200,900,16/9)).toEqual({width:1200,height:675,left:0,top:112.5})
    expect(containCameraFrame(1200,600,4/3)).toEqual({width:800,height:600,left:200,top:0})
    expect(containCameraFrame(900,900,0)).toEqual(containCameraFrame(900,900,16/9))
  })
  it.each([1,2,3,4] as const)('keeps mirrored input and shared overlay coordinates identical for %i players', count => {
    const frame = containCameraFrame(1440,900,4/3)
    for (const zone of defaultCameraZones(count)) {
      const raw = {x:1 - (zone.x + zone.width * .3),y:.65}
      const local = mapCameraPoint(raw,zone)!
      const rendered = {x:frame.left + (zone.x + local.x * zone.width) * frame.width,y:frame.top + local.y * frame.height}
      expect(rendered.x).toBeCloseTo(frame.left + (1-raw.x) * frame.width)
      expect(rendered.y).toBeCloseTo(frame.top + raw.y * frame.height)
    }
  })
})
