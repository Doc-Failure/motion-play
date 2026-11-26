import { dojoRank } from '../ninja-training/dojoRanks'

/** Horizontal distances are measured in lane widths. Heights are fractions of the full camera frame. */
export const RUNNER_X = .20
export const FLOOR = .86
export const GATE_DISTANCE = 6.4
export const platforms = [
  { start: .94, width: .19, height: .10, art: 'crate' },
  { start: 2.28, width: .46, height: .12, art: 'bridge' },
  { start: 3.48, width: .22, height: .14, art: 'crate' },
  { start: 4.8, width: .48, height: .13, art: 'bridge' },
]
export const encounters = [
  { at: .12, rank: 2 }, { at: 1.38, rank: 3 }, { at: 2.82, rank: 2 },
  { at: 3.89, rank: 4 }, { at: 5.46, rank: 5 },
]
export function location(distance: number) {
  return distance < 2 ? 'Bamboo Trail' : distance < 4.55 ? 'River Crossing' : 'Moon Gate'
}
export function foeAt(distance: number, elapsed: number, gateTime: number, aspect: number, level: number) {
  const boss = distance >= GATE_DISTANCE
  const index = boss ? encounters.length : encounters.findIndex(e => distance >= e.at && distance < e.at + .93)
  if (index < 0) return null
  const rank = dojoRank(boss ? 6 : encounters[index].rank)
  const age = elapsed - gateTime
  const progress = boss ? (age % 3400) / 3400 : (distance - encounters[index].at) / .93
  const charge = Math.max(0, 1 - Math.abs(progress - .74) / .23)
  const ry = Math.min(boss ? .138 : .092, (boss ? .24 : .18) * aspect)
  const rx = ry / aspect
  const attackStart = boss ? .51 : .48
  const attackEnd = boss ? .78 : .89
  const flight = Math.max(0, Math.min(1, (progress - attackStart) / (attackEnd - attackStart)))
  const x = boss ? .68 - .47 * charge : progress < .88 ? .94 - progress * .84 : .20 - (progress-.88)*2.3
  const y = FLOOR - ry - Math.sin(Math.PI * flight) * (boss ? .19 : .24)
  return { index, boss, rank: rank.slug, name: rank.name, maxHp: boss ? 8 + Math.min(level-1,4)*2 : Math.ceil(rank.hits/2),
    x, y, rx, ry, progress, age, flight, encounterMs: .93 * gateTime / GATE_DISTANCE, charge: boss ? Math.floor(age / 3400) : index,
    threatens: boss ? progress >= .70 && progress <= .78 : progress >= .88 }
}
export type Foe = NonNullable<ReturnType<typeof foeAt>>
