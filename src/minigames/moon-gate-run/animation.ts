import type { Runner } from './MoonGateModel'
import type { Foe } from './course'

export const sheets = {
  leaf: [6,4], foes: [6,4], reactions: [5,4], oni: [5,3], effects: [4,6], shadow: [4,1],
  bamboo: [4,1], river: [4,1], bridge: [4,1], gate: [4,1], road: [4,1],
} as const
export type Sheet = keyof typeof sheets
export interface Cel { sheet: Sheet | 'actions' | 'flight'; frame: number; action: string }
const cel = (sheet: Cel['sheet'], frame: number, action: string): Cel => ({ sheet, frame, action })
const beat = (age: number, ms: number, count: number) => Math.min(count-1, Math.max(0,Math.floor(age/ms)))
export const effectFrame = (age: number, duration: number, reduced: boolean) => reduced ? 2 : beat(age, duration/4, 4)

export function runnerCel(r: Runner, time: number, gateAge: number, reduced: boolean): Cel {
  const hurt = time-r.hurtAt, swing = time-r.swingAt, hop = time-r.jumpAt, land = time-r.landAt
  if (!r.life) {
    if (reduced || hurt >= 550) return cel('actions',4,'down')
    return hurt < 150 ? cel('actions',2,'knockout') : cel('leaf',21,'fall')
  }
  if (r.won) {
    const age = time-r.fallen!.at
    if (age < 155) return cel('leaf',(r.airSwing ? 16 : 13)+(age >= 85 ? 1 : 0),'finishing-swat')
    return cel('leaf',reduced ? 22 : 22+Math.floor((age-155)/230)%2,'celebrate')
  }
  if (time-r.bumpAt < 330) return cel('leaf', time-r.bumpAt < 130 ? 10 : 11, 'scramble')
  if (hurt < 330) return hurt < 150 ? cel('actions',2,'hurt') : cel('leaf',20,'recover')
  if (swing < 235) return cel('leaf',(r.airSwing ? 15 : 12)+(reduced ? 1 : beat(swing,65,3)),r.airSwing?'air-swat':'swat')
  if (!r.grounded) {
    if (hop < 105) return cel('leaf',hop < 45 ? 6 : 7,'push-off')
    return cel('flight',r.speedY > .25 ? 0 : r.speedY < -.25 ? 2 : 1,'jump')
  }
  if (land < 155) return cel('leaf',land < 80 ? 8 : 9,'land')
  if (gateAge >= 0) return cel('leaf',gateAge < 300 ? 18 : 19,gateAge < 300 ? 'stop' : 'guard')
  return cel('leaf',reduced ? 0 : Math.floor(time/90)%6,'run')
}

const costumeRow: Record<string, number> = { lantern:0, frost:1, crane:2, violet:3 }
export function enemyCel(f: Foe, time: number, lastHit: number, defeatAge: number | null, reduced: boolean): Cel {
  if (defeatAge !== null) {
    if (f.boss) return cel('oni',reduced ? 14 : 10+beat(defeatAge,165,5),'collapse')
    const frame = reduced ? 4 : beat(defeatAge,112,5)
    return cel('reactions',costumeRow[f.rank]*5+frame,'tumble')
  }
  const hit = time-lastHit
  if (hit < 260) {
    const step = reduced ? 0 : beat(hit,90,3)
    if (f.boss) return cel('oni',[10,11,9][step],'stagger')
    return step === 2 ? cel('foes',costumeRow[f.rank]*6+5,'recover') : cel('reactions',costumeRow[f.rank]*5+step,'stagger')
  }
  if (f.boss) {
    if (f.age < 530) return cel('oni',f.age<250?0:1,'entrance')
    if (f.progress < .39) return cel('oni',reduced ? 2 : 2+Math.floor(time/300)%2,'guard')
    if (f.progress < .51) return cel('oni',f.progress < .46 ? 4 : 5,'wind-up')
    if (f.flight < 1) return cel('oni',f.flight < .25 ? 5 : f.flight < .68 ? 6 : 7,'charge')
    if (f.progress < .87) return cel('oni',8,'slam')
    return cel('oni',9,'recover')
  }
  const base = costumeRow[f.rank]*6
  if (f.progress < .39) return cel('foes',base+(reduced ? 0 : Math.floor(time/105)%4),'approach')
  if (f.progress < .48) return cel('foes',base+4,'wind-up')
  if (f.flight < 1) return cel('flight',Math.min(2,Math.floor(f.flight*3)),'leap')
  return cel('foes',base+5,'exit')
}

export const pack = '/assets/minigames/moon-gate-run/animation/'
export function preloadSprites() {
  for (const name of Object.keys(sheets)) new Image().src = pack+name+'.webp'
}
export const playerBadge = (id:number) => pack+'player-'+id+'.webp'
