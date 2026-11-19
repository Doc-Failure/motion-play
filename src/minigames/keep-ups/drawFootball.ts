import {BALL_RADIUS,KEEP_UPS_LIVES,footballWind,type Football} from './KeepUpsModel'
/** Original paper football and touchline, drawn directly over the live camera. */
export function drawFootball(c:CanvasRenderingContext2D,b:Football,time:number,w:number,h:number,reduced:boolean){
 c.clearRect(0,0,w,h);c.lineJoin='round';c.lineCap='round';c.strokeStyle='#29313c';c.lineWidth=2
 const line=(points:number[][],color='#fff3d5',width=2)=>{c.beginPath();c.strokeStyle=color;c.lineWidth=width;points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}
 const text=(s:string,x:number,y:number,size=20)=>{c.font=`700 ${size}px "Motion Hand",cursive`;c.textAlign='center';c.lineWidth=5;c.strokeStyle='#29313c';c.strokeText(s,x,y,w*.9);c.fillStyle='#fff5dd';c.fillText(s,x,y,w*.9)}
 // A low touchline and bunting leave the player visible.
 c.fillStyle='#72b77955';c.fillRect(0,h*.92,w,h*.08)
 line([[0,h*.92],[w*.5,h*.925],[w,h*.92]])
 for(let i=0;i<7;i++){const x=i*w/6;line([[x,h*.1],[x+w/12,h*.105]],'#fff3d599',1);c.beginPath();c.moveTo(x,h*.1);c.lineTo(x+Math.min(16,w/15),h*.105);c.lineTo(x+Math.min(8,w/30),h*.14);c.closePath();c.fillStyle=['#f4bd72','#a0d9d6','#e5a8be'][i%3];c.fill()}
 const lives=Math.max(0,KEEP_UPS_LIVES-b.drops)
 if(!lives){text('OUT OF LIVES',w*.5,h*.45,Math.min(26,w*.11));return}
 const wind=footballWind(time)
 if(wind.warning||wind.active)text(`${wind.direction>0?'→':'←'} ${wind.warning?'Wind coming!':'GUST!'}`,w*.5,h*.64,Math.min(22,w*.1))
 if(wind.active&&!reduced)for(let i=0;i<4;i++){const x=(time*.2+i*w/4)%w;line([[x,h*.3+i*14],[x-wind.direction*30,h*.3+i*14]],'#fff3d599',2)}
 const age=time-b.cueAt,r=BALL_RADIUS*h
 if(b.streak>=3){const x=(b.hoop%2?.75:.25)*w,y=h*.2;c.beginPath();c.ellipse(x,y,r*1.4,r*1.4,0,0,Math.PI*2);c.strokeStyle='#ffda72';c.lineWidth=5;c.stroke();text('+30',x,y+6,Math.min(18,w*.08))}
 if(time<b.serveAt){text('Life lost · new ball!',w*.5,h*.45,Math.min(28,w*.12));return}
 if(!reduced)for(const [i,p] of b.trail.entries()){c.beginPath();c.arc(p.x*w,p.y*h,r*(i+1)/12,0,Math.PI*2);c.fillStyle=`rgba(255,227,143,${(i+1)/35})`;c.fill()}
 // Contact squashes and releases; polygon panels rotate with the ball.
 c.save();c.translate(b.x*w,b.y*h)
 const squash=!reduced&&age<180&&(b.cue==='bounce'||b.cue==='header')?Math.sin(age/180*Math.PI)*.2:0
 c.scale(1+squash,1-squash);if(!reduced)c.rotate(b.spin)
 c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fillStyle='#fff5dd';c.fill();c.strokeStyle='#29313c';c.lineWidth=3;c.stroke()
 const poly=(x:number,y:number,size:number)=>{c.beginPath();for(let i=0;i<5;i++){const a=i*Math.PI*2/5-Math.PI/2;const px=x+Math.cos(a)*size,py=y+Math.sin(a)*size;if(i)c.lineTo(px,py);else c.moveTo(px,py)}c.closePath();c.fillStyle='#29313c';c.fill()}
 c.save();c.beginPath();c.arc(0,0,r-2,0,Math.PI*2);c.clip();poly(0,0,r*.4)
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5-Math.PI/2;poly(Math.cos(a)*r*.92,Math.sin(a)*r*.92,r*.25);line([[Math.cos(a)*r*.35,Math.sin(a)*r*.35],[Math.cos(a)*r*.84,Math.sin(a)*r*.84]],'#29313c',1.5)}c.restore();c.restore()
 if(age<650&&b.cue&&b.cue!=='drop'){
  const message=b.cue==='bonus'?'GOLDEN TOUCH! +30':b.cue==='header'?'HEADER!':'NICE TOUCH!'
  text(message,w*.5,h*.79,Math.min(26,w*.105))
  if(!reduced)for(let i=0;i<8;i++){const a=i*Math.PI/4,d=r+age*.09;c.fillStyle=['#ffda72','#91dfd8','#eda6bb'][i%3];c.fillRect(b.x*w+Math.cos(a)*d,b.y*h+Math.sin(a)*d,5,5)}
 }
 if(b.streak>1)text(`${b.streak} IN A ROW`,w*.5,h*.86,Math.min(24,w*.1))
}
