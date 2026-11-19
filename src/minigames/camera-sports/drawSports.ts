import {keeperPositions,rallyNetX,rallyPositions} from './rallyFormation'
import {NET,rallyLabel,type SportsSnapshot} from './SportsModel'
import {kickerPose} from './kickerPose'
import type {PlayerCount} from '../../input/PlayerZoneMapper'
const kicker=new Image()
kicker.src=`${import.meta.env.BASE_URL}assets/minigames/goalkeeper/kicker-crayon.webp`
const kickerSheet=new Image()
kickerSheet.src=`${import.meta.env.BASE_URL}assets/minigames/goalkeeper/kicker-poses.webp`
export function drawSports(c:CanvasRenderingContext2D,s:SportsSnapshot,w:number,h:number,players:PlayerCount,reduced:boolean){
 c.clearRect(0,0,w,h);c.lineCap='round';c.lineJoin='round'
 const line=(a:number,b:number,x:number,y:number,color='#fff6df',width=3)=>{c.beginPath();c.moveTo(a,b);c.lineTo(x,y);c.strokeStyle=color;c.lineWidth=width;c.stroke()}
 const label=(text:string,x:number,y:number,color='#fff6df')=>{c.font=`bold ${Math.max(14,h*.032)}px "Motion Hand"`;c.textAlign='center';c.lineWidth=4;c.strokeStyle='#29313c';c.strokeText(text,x,y);c.fillStyle=color;c.fillText(text,x,y)}
 const ball=(x:number,y:number,r:number,spin:number,volley=false)=>{c.save();c.translate(x,y);if(!reduced)c.rotate(spin);c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fillStyle=volley?'#ffe17a':'#fff6df';c.fill();c.strokeStyle='#29313c';c.lineWidth=2;c.stroke();c.beginPath();for(let i=0;i<5;i++){const a=i*Math.PI*2/5;c.lineTo(Math.sin(a)*r*.45,Math.cos(a)*r*.45)}c.closePath();c.fillStyle=volley?'#74d6df':'#29313c';c.fill();for(let i=0;i<5;i++){const a=i*Math.PI*2/5;line(Math.sin(a)*r*.45,Math.cos(a)*r*.45,Math.sin(a)*r,Math.cos(a)*r,'#29313c',1.5)}c.restore()}
 if(s.mode==='keeper'){
  const recentGoal=s.shots.find(shot=>shot.state==='goal'&&s.elapsed-shot.resolved<650)
  const shake=recentGoal&&!reduced?Math.sin((s.elapsed-recentGoal.resolved)/40)*Math.max(0,1-(s.elapsed-recentGoal.resolved)/650)*5:0
  for(let i=0;i<=12;i++)line(w*i/12,.49*h,w*i/12+shake,.93*h,'#fff6df33',1)
  for(let i=0;i<=4;i++)line(0,.49*h+i*h*.11,w,.49*h+i*h*.11+shake,'#fff6df33',1)
  line(4,.93*h,4,.49*h,'#fff6df',5);line(w-4,.49*h,w-4,.93*h,'#fff6df',5);line(4,.49*h,w-4,.49*h,'#fff6df',5)
  const positions=keeperPositions(players)
  for(const shot of s.shots){
  const left=(shot.playerId-1)*w/players,lw=w/players
  const x=left+shot.x*lw,y=shot.y*h,p=shot.progress,age=(s.elapsed-shot.resolved)/650
  if(players>1)label(`P${shot.playerId} · ${positions[shot.playerId-1]}`,left+lw/2,h*.9)
  // Original footballer: wind-up and forward kick at the actual release time.
  const cx=left+lw*.5,unit=Math.min(lw*.22,h*.11),wind=shot.state==='incoming'&&p===0,foot=!reduced?(wind?-Math.sin(Math.min(1,(s.elapsed-shot.resolved)/450)*Math.PI)*.35:p<.18?.5:0):0
  if(wind&&s.elapsed>=shot.resolved){c.save();c.setLineDash([5,6]);c.strokeStyle='#ffe17a';c.lineWidth=3;c.beginPath();c.arc(cx,h*.22,unit*1.25,0,Math.PI*2);c.stroke();c.restore()}
  if(kickerSheet.complete&&kickerSheet.naturalWidth){const frame=kickerPose(shot,s.elapsed),size=kickerSheet.naturalWidth/2;c.save();c.translate(cx,h*.22);if(!reduced)c.rotate(foot*.12);c.drawImage(kickerSheet,(frame%2)*size,Math.floor(frame/2)*size,size,size,-unit*1.1,-unit*1.1,unit*2.2,unit*2.2);c.restore()}
  else if(kicker.complete&&kicker.naturalWidth){c.save();c.translate(cx,h*.22);if(!reduced)c.rotate(foot*.12);c.drawImage(kicker,-unit*1.1,-unit*1.1,unit*2.2,unit*2.2);c.restore()}else{
  c.save();c.translate(cx,h*.22);c.scale(unit,unit)
  line(-.18,.28,-.25,.8,'#fff6df',.17);line(.18,.28,.28+foot,.78,'#fff6df',.17)
  line(-.25,.8,-.05,.83,'#29313c',.16);line(.28+foot,.78,.47+foot,.8,'#29313c',.16)
  line(-.3,-.35,-.6,-.02,'#e8b986',.15);line(.3,-.35,.55,-.08,'#e8b986',.15)
  c.fillStyle='#ed705e';c.strokeStyle='#29313c';c.lineWidth=.04;c.beginPath();c.moveTo(-.3,-.5);c.lineTo(.3,-.5);c.lineTo(.35,.3);c.lineTo(-.35,.3);c.closePath();c.fill();c.stroke()
  line(-.2,-.3,.18,-.32,'#ffd1a7',.045);line(-.2,-.18,.12,-.2,'#ffd1a7',.035)
  c.fillStyle='#e8b986';c.beginPath();c.arc(0,-.74,.25,0,Math.PI*2);c.fill();c.stroke();line(-.16,-.94,.16,-.94,'#29313c',.1)
  line(-.08,-.76,-.08,-.73,'#29313c',.035);line(.08,-.76,.08,-.73,'#29313c',.035);c.beginPath();c.arc(0,-.67,.08,.2,Math.PI-.2);c.stroke();c.restore()
  }
  if(shot.state==='incoming'){
   if(s.elapsed>=shot.resolved)ball(x,y,h*(.016+p*.032),p*6)
  }else if(shot.state==='save'){c.save();c.globalAlpha=Math.max(0,1-age);c.strokeStyle='#ffe17a';c.lineWidth=4;c.beginPath();c.arc(x,y,h*(.055+(reduced?0:age*.06)),0,Math.PI*2);c.stroke();c.restore();ball(x+(reduced?0:age*lw*.2),y-(reduced?0:Math.sin(age*Math.PI)*h*.22),h*.052*(1-age*.5),age*6);label('SAVED!',left+lw/2,h*.5,'#a5d88b')}
  else{ball(x,y,h*.052*(1+age*.7),0);label('GOAL',left+lw/2,h*.5,'#ed9ba5')}
  }
 }else{
  const b=s.ball
  const net=rallyNetX(players),left=(net-NET.halfWidth)*w,right=(net+NET.halfWidth)*w,top=NET.top*h,floor=NET.floor*h
  c.fillStyle='#74d6df30';c.fillRect(0,floor,net*w,h-floor);c.fillStyle='#ed9ba530';c.fillRect(net*w,floor,(1-net)*w,h-floor)
  line(0,floor,w,floor,'#29313c',8);line(0,floor,w,floor,'#fff6df',3)
  // Opaque tape and dark-backed mesh remain visible over bright or dark camera scenes.
  c.fillStyle='#29313caa';c.fillRect(left,top,right-left,floor-top)
  for(let y=top+12;y<floor;y+=14){line(left,y,right,y,'#fff6df',1.5)}
  line(w*net,top,w*net,floor,'#fff6df',1.5)
  line(left,top,left,floor,'#29313c',7);line(right,top,right,floor,'#29313c',7)
  line(left,top,left,floor,'#ffe17a',3);line(right,top,right,floor,'#ffe17a',3)
  line(left-3,top,right+3,top,'#29313c',12);line(left-3,top,right+3,top,'#fff6df',7)
  label('NET',w*net,top-14,'#ffe17a')
  if(players>=3){
   rallyPositions(players).forEach((role,i)=>label(`P${i+1} · ${role}`,(i+.5)*w/players,h*.2,(i+.5)/players<net?'#74d6df':'#ed9ba5'))
  }else {label(`${rallyLabel(0,players as PlayerCount)} · ${s.teams[0]}`,w*.25,h*.2,'#74d6df');label(`${rallyLabel(1,players as PlayerCount)} · ${s.teams[1]}`,w*.75,h*.2,'#ed9ba5')}
  if(players===1){line((s.aiX-.055)*w,h*.72,(s.aiX+.055)*w,h*.63,'#29313c',h*.03);line((s.aiX-.055)*w,h*.72,(s.aiX+.055)*w,h*.63,'#ed9ba5',h*.024);label('ROBOT',s.aiX*w,h*.79)}
  if(s.elapsed<b.serveAt)label('Ready for serve',w*.5,h*.35)
  ball(b.x*w,b.y*h,h*.035,s.elapsed/450,true)
  if(s.cue==='point'&&s.elapsed-s.cueTime<800)label(players===3?'CROSS!':'POINT!',w*.5,h*.3,'#ffe17a')
 }
}
