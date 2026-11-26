import type {PlayableGame} from '../camera/CameraSetup'

type Game = PlayableGame | 'retired-jam' | 'original-punch' | 'original-keeper'
/** Goals use each game's native score (metres in the race, ten points per rally). */
const goals: Partial<Record<Game, readonly [number, number, number]>> = {
  'retired-jam':[40,10,110], 'original-punch':[30,10,90], 'original-keeper':[20,10,90],
  'pinata-party':[50,10,120], 'monster-defense':[100,15,205], 'dodgeball':[20,10,90],
  'laser-escape':[10,10,80], 'dance-challenge':[20,10,90], freeze:[10,5,40], 'jump-rush':[20,10,90],
  'paint-splash':[25,8,81], 'graffiti-race':[25,8,81], 'car-wash':[8,2,22], 'pizza-maker':[40,10,110],
  'tower-builder':[20,10,90], 'air-pong':[10,5,45], 'basketball-blitz':[6,2,20], 'simon-says':[10,10,80],
  'plate-spinner':[30,10,100], 'magic-duel':[20,10,100], 'rocket-rumble':[40,20,160], 'silk-squad':[30,15,130],
  jenga: [3, 1, 9], 'floor-is-lava': [3, 1, 5], 'shadow-snap': [40, 10, 110], 'marble-bowling': [3, 1, 9], 'six-hoops': [10, 5, 50], 'ufo-juggler': [50, 20, 190],
  'moon-gate-run': [100, 10, 140], 'ghost-catcher': [50, 35, 295], 'kangaroo-race': [65, 15, 170],
  'window-wipe': [55, 18, 181], 'ninja-training': [35, 20, 175],
  'punch-arena': [40, 25, 215],
  'keep-ups': [20, 10, 90], goalkeeper: [20, 10, 90], 'net-rally': [20, 10, 50],
}
export function scoreGoal(game:Game,level:number,players=1){
  const [base,step,cap]=goals[game]??[30,10,90]
  const target=Math.min(cap,base+step*(level-1))
  if(['floor-is-lava','shadow-snap','car-wash','pinata-party','monster-defense'].includes(game))return target*players
  return game==='goalkeeper'?Math.ceil(target*(1+(players-1)*.5)):target
}
export function challengePressure(level:number,assist=0){
  return Math.max(-.15,Math.min(1,(level-1)/7)-assist)
}
export type ArcadeGame = Game
