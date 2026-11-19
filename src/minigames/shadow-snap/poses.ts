export type Direction = 'up' | 'out' | 'down'
export type Pose = readonly [Direction, Direction]
export interface Picture { name:string; poses:Pose[]; roles:string[]; motif?:'butterfly'|'dragon' }

const up:Pose=['up','up'], wings:Pose=['out','out'], left:Pose=['up','down'], right:Pose=['down','up']

export function pictureDeck(count:number, pressure:number):Picture[] {
  if (count===1) {
    const solo=(name:string,pose:Pose):Picture=>({name,poses:[pose],roles:['']})
    return [solo('Reach for the stars',up),solo('Airplane',wings),solo('Superhero',left),
      solo('Crooked cactus',['out','up']),solo('Teapot',['down','out']),
      ...(pressure>=.25?[solo('Lightning bolt',right),solo('Weather vane',['up','out'])]:[])]
  }
  const group=(name:string,start:Pose,middle:Pose,end:Pose,first:string,inner:string,last:string,motif?:Picture['motif']):Picture=>({
    name,motif,poses:[start,...Array<Pose>(count-2).fill(middle),end],
    roles:[first,...Array<string>(count-2).fill(inner),last]
  })
  return [group('Butterfly',left,up,right,'Left wing','Body','Right wing','butterfly'),
    group('Paper dragon',['up','out'],wings,['out','down'],'Head','Scales','Tail','dragon'),
    group('Drawbridge',['out','up'],up,['up','out'],'West tower','Arch','East tower'),
    group('Breaking wave',['down','out'],['out','up'],right,'Ripple','Swell','Crest'),
    ...(pressure>=.25?[group('Firework',left,wings,right,'Spark','Burst','Spark')]:[])]
}

// Screen-space vectors point from a shoulder to its wrist, with positive Y down.
export function armVector(direction:Direction, side:number):readonly [number,number] {
  const outward=side===0?-1:1
  if (direction==='up') return [.342*outward,-.940]
  if (direction==='out') return [outward,0]
  return [.22*outward,.976]
}
