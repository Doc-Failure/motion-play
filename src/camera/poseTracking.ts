/** Diagnostic geometry only. These landmarks never award game points. */
export interface PosePoint { x:number; y:number; visibility?:number; presence?:number }
export interface StickBody { torso:PosePoint[]; arms:PosePoint[][]; hands:PosePoint[]; x:number }
const visible = (p:PosePoint|undefined):p is PosePoint => !!p && Number.isFinite(p.x) && Number.isFinite(p.y)
  && p.x>=0 && p.x<=1 && p.y>=0 && p.y<=1 && (p.visibility??0)>=.6 && (p.presence??1)>=.6
const mirror = (p:PosePoint):PosePoint => ({...p,x:1-p.x})
const midpoint = (a:PosePoint,b:PosePoint):PosePoint => ({x:(a.x+b.x)/2,y:(a.y+b.y)/2})

export function stickBodies(poses:PosePoint[][]):StickBody[] {
  return poses.flatMap(points=>{
    const [left,right,hipLeft,hipRight]=[points[11],points[12],points[23],points[24]]
    if(![left,right,hipLeft,hipRight].every(visible))return []
    const neck=mirror(midpoint(left,right)),hip=mirror(midpoint(hipLeft,hipRight))
    const arms=[[11,13,15],[12,14,16]].flatMap(ids=>{
      const chain=ids.map(id=>points[id]);return chain.every(visible)?[[neck,...chain.map(mirror)]]:[]
    })
    return [{torso:[neck,hip],arms,hands:[points[15],points[16]].filter(visible).map(mirror),x:hip.x}]
  }).sort((a,b)=>a.x-b.x)
}

export interface PoseTracker {
  detect(video:HTMLVideoElement,time:number):PosePoint[][]
  close():void
}
export async function createPoseTracker(players:number):Promise<PoseTracker> {
  // A separate local runtime keeps the main app's connect-src 'none' policy.
  // Only this opt-in document can fetch its bundled model/WASM; never camera data.
  const frame=document.createElement('iframe')
  frame.hidden=true;frame.title='Local body tracking runtime'
  frame.src=`${import.meta.env.BASE_URL}pose/tracker.html`
  try {
    await new Promise<void>((resolve,reject)=>{
      const timeout=window.setTimeout(()=>reject(new Error('Tracking runtime timed out')),15000)
      frame.onload=()=>{window.clearTimeout(timeout);resolve()}
      frame.onerror=()=>{window.clearTimeout(timeout);reject(new Error('Tracking runtime unavailable'))}
      document.body.append(frame)
    })
    const runtime=frame.contentWindow as (Window & {createLocalPoseTracker?:(players:number)=>Promise<PoseTracker>})|null
    if(!runtime?.createLocalPoseTracker)throw new Error('Tracking runtime unavailable')
    const tracker=await runtime.createLocalPoseTracker(players)
    return {detect:(video,time)=>tracker.detect(video,time),close:()=>{tracker.close();frame.remove()}}
  }catch(error){frame.remove();throw error}
}
