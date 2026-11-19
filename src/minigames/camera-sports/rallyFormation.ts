import type {PlayerCount} from '../../input/PlayerZoneMapper'

export function rallyNetX(players:PlayerCount) { return players === 3 ? 1/3 : .5 }

export function rallyInstructions(players:number) {
  switch (players) {
    case 1: return 'Stand LEFT against the robot. Hit up and across the net. First to five!'
    case 2: return '1 vs 1: P1 stands LEFT, P2 stands RIGHT. Hit up and across the net. First to five!'
    case 3: return 'Rally together! P1 left, P2 by the net on the right, P3 deep right. Send five balls across.'
    default: return 'Doubles! P2 and P3 cover the net. P1 backs up P2 on the left, P4 backs up P3 on the right.'
  }
}

export function rallyPositions(players:number) {
 switch(players) {
  case 1: return ['Left']
  case 2: return ['Left','Right']
  case 3: return ['Left','Net','Back']
  default: return ['Back','Net','Net','Back']
 }
}

export function keeperPositions(players:number) {
 if(players===1)return ['Goal']
 if(players===2)return ['Left post','Right post']
 if(players===3)return ['Left post','Middle','Right post']
 return ['Left post','Left centre','Right centre','Right post']
}
export function keeperInstructions(players:number) {
 return players===1?'Watch the kicker. Block the ball with your hands or body before it gets past you!':
  'Guard one goal together. Cover your spot and reach across to help a teammate save!'
}
