type Point = { x:number; y:number }
type Sample = Point & {timestamp:number;pointerId?:string}

/** Sweep a round brush only between nearby, consecutive observations from the same hand. */
export function brushStroke(previous:Sample|undefined,current:Sample,radius:number) {
  const gap = current.timestamp-(previous?.timestamp ?? -Infinity)
  const continuous = previous && gap>0 && gap<=160 && previous.pointerId===current.pointerId
    && Math.hypot(current.x-previous.x,current.y-previous.y)<=.36
  const start = continuous ? previous : current
  const dx = current.x-start.x, dy = current.y-start.y
  const length2 = dx*dx+dy*dy
  return (x:number,y:number) => {
    const t = length2 ? Math.max(0,Math.min(1,((x-start.x)*dx+(y-start.y)*dy)/length2)) : 0
    return (x-start.x-t*dx)**2+(y-start.y-t*dy)**2<=radius*radius
  }
}
