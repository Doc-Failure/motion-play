import type { StickBody } from '../camera/poseTracking'
import type { MotionInputEvent } from './MotionProcessor'
import type { PlayerCount, PlayerId } from './PlayerZoneMapper'

export function playerHands(bodies: StickBody[], players: PlayerCount, timestamp: number): MotionInputEvent[] {
  return Array.from({ length: players }, (_, lane) => {
    const owners = bodies.filter(body => Math.min(players - 1, Math.floor(body.neck.x * players)) === lane)
    if (owners.length !== 1) return []
    const body = owners[0]
    return (body.palms ?? body.hands).flatMap((hand, i) => {
      const wrist = body.wristIds?.[i]
      const x = hand.x * players - lane
      if (wrist === undefined || x < 0 || x > 1) return []
      return [{ kind: 'HAND_POSITION' as const, playerId: (lane + 1) as PlayerId, x, y: hand.y,
        confidence: Math.min(hand.visibility ?? 1, hand.presence ?? 1), timestamp, pointerId: String(wrist) }]
    })
  }).flat()
}
