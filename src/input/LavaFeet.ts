import type { StickBody } from '../camera/poseTracking'

export interface FloorPoint { x: number; y: number }
export type Feet = [FloorPoint, FloorPoint]
export interface FloorSample { time: number; feet: Feet[] }

/** Mirrored whole-camera coordinates. Teammates can share any part of the floor. */
export function lavaFeet(bodies: StickBody[], time: number): FloorSample {
  const feet: Feet[] = []
  for (const body of bodies) {
    if (body.legs.length !== 2) continue
    const [left, right] = body.legs.map(leg => leg.at(-1))
    if (left && right) feet.push([left, right])
  }
  return { time, feet }
}
