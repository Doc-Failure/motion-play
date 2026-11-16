/** Diagnostic geometry only. These landmarks never award game points. */
export interface PosePoint { x:number; y:number; visibility?:number; presence?:number }
export interface StickBody { neck:PosePoint; torso:PosePoint[]; arms:PosePoint[][]; legs:PosePoint[][]; hands:PosePoint[]; head?:PosePoint; headRadius:number; x:number }
const visible = (p:PosePoint|undefined):p is PosePoint => !!p && Number.isFinite(p.x) && Number.isFinite(p.y)
  && p.x>=0 && p.x<=1 && p.y>=0 && p.y<=1 && (p.visibility??0)>=.6 && (p.presence??1)>=.6
const mirror = (p:PosePoint):PosePoint => ({...p,x:1-p.x})
const midpoint = (a:PosePoint,b:PosePoint):PosePoint => ({x:(a.x+b.x)/2,y:(a.y+b.y)/2})

export function stickBodies(poses:PosePoint[][]):StickBody[] {
  return poses.flatMap(points=>{
    const [left,right,hipLeft,hipRight]=[points[11],points[12],points[23],points[24]]
    if(![left,right].every(visible))return []
    const neck=mirror(midpoint(left,right))
    const hip=visible(hipLeft)&&visible(hipRight)?mirror(midpoint(hipLeft,hipRight)):undefined
    const arms=[[11,13,15],[12,14,16]].flatMap(ids=>{
      const chain=ids.map(id=>points[id]);return chain.every(visible)?[[neck,...chain.map(mirror)]]:[]
    })
    const legs=hip?[[23,25,27],[24,26,28]].flatMap(ids=>{
      const chain=ids.map(id=>points[id]);return chain.every(visible)?[[hip,...chain.map(mirror)]]:[]
    }):[]
    const head=visible(points[0])?mirror(points[0]):undefined
    const headRadius=Math.max(.012,Math.min(.045,Math.abs(left.x-right.x)*.18))
    return [{neck,torso:hip?[neck,hip]:[],arms,legs,hands:[points[15],points[16]].filter(visible).map(mirror),head,headRadius,x:hip?.x??neck.x}]

  }).sort((a,b)=>a.x-b.x)
}

export interface PoseTracker {
  detect(video:HTMLVideoElement,time:number):PosePoint[][]
  close():void
}
export function createPoseTracker(players:number,signal?:AbortSignal):Promise<PoseTracker> {
  // A separate local runtime preserves the main app's connect-src 'none' policy.
  return new Promise((resolve,reject)=>{
    const frame=document.createElement('iframe')
    frame.hidden=true;frame.title='Local body tracking runtime'
    frame.src=`${import.meta.env.BASE_URL}pose/tracker.html`
    let closed=false,tracker:PoseTracker|undefined
    const close=()=>{
      if(closed)return
      closed=true;window.clearTimeout(timeout);signal?.removeEventListener('abort',abort)
      tracker?.close();frame.remove()
    }
    const abort=()=>{close();reject(new DOMException('Tracking cancelled','AbortError'))}
    const timeout=window.setTimeout(()=>{close();reject(new Error('Tracking runtime timed out'))},45000)
    frame.onerror=()=>{close();reject(new Error('Tracking runtime unavailable'))}
    frame.onload=async()=>{
      if(closed)return
      try {
        const runtime=frame.contentWindow as (Window & {createLocalPoseTracker?:(players:number)=>Promise<PoseTracker>})|null
        if(!runtime?.createLocalPoseTracker)throw new Error('Tracking runtime unavailable')
        const loaded=await runtime.createLocalPoseTracker(players)
        if(closed){loaded.close();return}
        tracker=loaded;window.clearTimeout(timeout)
        resolve({detect:(video,time)=>loaded.detect(video,time),close})
      }catch(error){if(!closed){close();reject(error)}}
    }
    if(signal?.aborted){abort();return}
    signal?.addEventListener('abort',abort,{once:true})
    document.body.append(frame)
  })
}
