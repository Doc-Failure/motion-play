import type {BodyMask} from '../input/MotionProcessor'
import type {DetectedHand} from '../input/HandGestureProcessor'
/** Mirrored measured geometry. Games receive normalized events through input adapters. */
export interface PosePoint { x:number; y:number; visibility?:number; presence?:number }
export interface StickBody { silhouette?:BodyMask; neck:PosePoint; shoulders?:[PosePoint,PosePoint]; torso:PosePoint[]; arms:PosePoint[][]; armIds?:number[]; legs:PosePoint[][]; legIds?:number[]; hands:PosePoint[]; palms?:PosePoint[]; wristIds?:number[]; head?:PosePoint; headRadius:number; x:number }
const visible = (p:PosePoint|undefined):p is PosePoint => !!p && Number.isFinite(p.x) && Number.isFinite(p.y)
  && p.x>=0 && p.x<=1 && p.y>=0 && p.y<=1 && (p.visibility??0)>=.6 && (p.presence??1)>=.6
const mirror = (p:PosePoint):PosePoint => ({...p,x:1-p.x})
const midpoint = (a:PosePoint,b:PosePoint):PosePoint => ({x:(a.x+b.x)/2,y:(a.y+b.y)/2})

export function stickBodies(poses:PosePoint[][], silhouettes?:BodyMask[]):StickBody[] {
  return poses.flatMap((points,index)=>{
    const [left,right,hipLeft,hipRight]=[points[11],points[12],points[23],points[24]]
    if(![left,right].every(visible))return []
    const neck=mirror(midpoint(left,right))
    const hip=visible(hipLeft)&&visible(hipRight)?mirror(midpoint(hipLeft,hipRight)):undefined
    const limbs=(indices:number[][],anchor:PosePoint|undefined)=>indices.flatMap((ids,side)=>{
      const chain=ids.map(id=>points[id])
      return anchor&&chain.every(visible)?[{side,points:[anchor,...chain.map(mirror)]}]:[]
    })
    const arms=limbs([[11,13,15],[12,14,16]],neck)
    const legs=limbs([[23,25,27],[24,26,28]],hip)
    // Nose sits forward of the head, particularly in profile; prefer the ear midpoint.
    const head=visible(points[7])&&visible(points[8])?mirror(midpoint(points[7],points[8]))
      :visible(points[2])&&visible(points[5])?mirror(midpoint(points[2],points[5]))
      :visible(points[0])?mirror(points[0]):undefined
    const headRadius=Math.max(.012,Math.min(.045,Math.abs(left.x-right.x)*.18))
    const wrists=[15,16].filter(index=>visible(points[index]))
    // The menu marker belongs in the palm, not at the wrist joint. Use only
    // measured, confident finger landmarks; keep a wrist fallback if occluded.
    const palms=wrists.map(index=>{
      const wrist=points[index],tips=(index===15?[17,19,21]:[18,20,22]).map(i=>points[i]).filter(visible)
      if(tips.length<2)return mirror(wrist)
      const center={x:tips.reduce((sum,p)=>sum+p.x,0)/tips.length,y:tips.reduce((sum,p)=>sum+p.y,0)/tips.length}
      if(Math.hypot(center.x-wrist.x,center.y-wrist.y)>.15)return mirror(wrist)
      return {...mirror(midpoint(wrist,center)),visibility:Math.min(wrist.visibility??1,...tips.map(p=>p.visibility??1))}
    })
    return [{silhouette:silhouettes?.[index],neck,shoulders:[mirror(left),mirror(right)] as [PosePoint,PosePoint],torso:hip?[neck,hip]:[],arms:arms.map(a=>a.points),armIds:arms.map(a=>a.side),legs:legs.map(l=>l.points),legIds:legs.map(l=>l.side),hands:wrists.map(index=>mirror(points[index])),palms,wristIds:wrists,head,headRadius,x:hip?.x??neck.x}]

  }).sort((a,b)=>a.x-b.x)
}

export interface PoseTracker {
  detect(video:HTMLVideoElement|HTMLCanvasElement,time:number,aspect?:number):PosePoint[][]
  silhouettes?():BodyMask[]
  enableHands?():Promise<boolean>
  detectHands?(frame:HTMLCanvasElement):DetectedHand[]
  close():void
}
export function createPoseTracker(players:number,signal?:AbortSignal,withHands=false,withMasks=false):Promise<PoseTracker> {
  return loadLocalTracker(signal, runtime => runtime.createLocalPoseTracker(players, withHands, withMasks))
}

interface HandTracker {
  detect(video: HTMLVideoElement, time: number): DetectedHand[]
  close(): void
}
interface LocalRuntime {
  createLocalHandTracker(): Promise<HandTracker>
  createLocalPoseTracker(players: number, hands: boolean, masks: boolean): Promise<PoseTracker>
}
export function createHandTracker(signal: AbortSignal): Promise<HandTracker> {
  return loadLocalTracker(signal, runtime => runtime.createLocalHandTracker())
}
function loadLocalTracker<T extends { close(): void }>(signal: AbortSignal | undefined, load: (runtime: LocalRuntime) => Promise<T>): Promise<T> {
  // A separate local runtime preserves the main app's connect-src 'none' policy.
  return new Promise((resolve,reject)=>{
    const frame=document.createElement('iframe')
    frame.hidden=true;frame.title='Local body tracking runtime'
    frame.src=`${import.meta.env.BASE_URL}pose/tracker.html`
    let closed=false,tracker:T|undefined
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
        const runtime = frame.contentWindow as (Window & LocalRuntime) | null
        if (!runtime) throw new Error('Tracking runtime unavailable')
        const loaded = await load(runtime)
        if(closed){loaded.close();return}
        tracker=loaded;window.clearTimeout(timeout)
        resolve({ ...loaded, close })
      }catch(error){if(!closed){close();reject(error)}}
    }
    if(signal?.aborted){abort();return}
    signal?.addEventListener('abort',abort,{once:true})
    document.body.append(frame)
  })
}
