import {hoops,HOOPS_RADIUS,type HoopsSnapshot} from './HoopsModel'
const ink='#29313c',paper='#fff6df',colors=['#74d6df','#ed9ba5','#bfa5e7','#a5d88b']
export function drawHoops(c:CanvasRenderingContext2D,s:HoopsSnapshot,w:number,h:number,reduced:boolean){
 c.clearRect(0,0,w,h);c.lineCap='round';c.lineJoin='round'
 const line=(points:number[][],color=ink,width=3)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke()}
 const ellipse=(x:number,y:number,rx:number,ry:number,fill:string,stroke=ink)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();c.strokeStyle=stroke;c.lineWidth=2;c.stroke()}
 c.font=`bold ${Math.max(12,h*.025)}px "Motion Hand", cursive`;c.textAlign='center';c.textBaseline='middle'
 for(const [i,hoop] of hoops.entries()){
  const x=hoop.x*w,y=hoop.y*h,rw=w*.065,netH=h*.075
  const hit=[...s.effects].reverse().find(e=>e.basket===i),age=hit?(s.elapsed-hit.time)/850:1
  const stretch=!reduced&&age<1?Math.sin(age*Math.PI)*h*.025:0
  const post=hoop.x<.5?x-rw*.9:x+rw*.9
  line([[post,y-netH*1.3],[post,y+netH*.5]],paper,7)
  c.fillStyle=age<1?'#ffe17aee':'#fff6dfbb';c.strokeStyle=ink;c.lineWidth=2;c.beginPath();c.roundRect(x-rw,y-netH*1.55,rw*2,netH*.95,5);c.fill();c.stroke()
  c.fillStyle=ink;c.fillText(`${hoop.points}`,x,y-netH*1.06)
  for(let j=0;j<5;j++){const k=j/4;line([[x-rw+k*rw*2,y],[x-rw*.6+k*rw*1.2,y+netH+stretch]],'#fff6df',2)}
  for(const f of [.33,.66,1])line([[x-rw*(1-.4*f),y+(netH+stretch)*f],[x+rw*(1-.4*f),y+(netH+stretch)*f]],'#fff6df',2)
  ellipse(x,y,rw,h*.009,'#f28c46','#29313c')
 }
 for(const b of s.balls){
  const age=(s.elapsed-b.ended)/850
  if(b.state==='missed')continue
  const radius=HOOPS_RADIUS*h,x=b.x*w,y=b.y*h+(b.state==='scored'&&!reduced?age*h*.09:0)
  if(!reduced&&b.state==='falling')b.trail.forEach((p,i)=>{c.globalAlpha=i/b.trail.length*.22;ellipse(p.x*w,p.y*h,radius*.65,radius*.65,b.owner?colors[b.owner-1]:'#ffc96f','transparent')})
  c.globalAlpha=b.state==='scored'?1-age:1;c.save();c.translate(x,y);if(!reduced)c.rotate(b.spin)
  ellipse(0,0,radius,radius,'#f5a052');line([[-radius,0],[radius,0]],ink,2);line([[0,-radius],[0,radius]],ink,2)
  c.beginPath();c.ellipse(0,0,radius*.48,radius,0,0,Math.PI*2);c.strokeStyle=ink;c.stroke()
  c.restore();if(b.owner){c.strokeStyle=colors[b.owner-1];c.lineWidth=3;c.beginPath();c.arc(x,y,radius+4,0,Math.PI*2);c.stroke()}
  c.globalAlpha=1
 }
 for(const e of s.effects){
  const age=(s.elapsed-e.time)/850,x=e.x*w,y=e.y*h
  if(e.kind==='miss')continue
  c.globalAlpha=1-age
  if(e.kind==='touch'){c.strokeStyle=e.player?colors[e.player-1]:paper;c.lineWidth=3;c.beginPath();c.arc(x,y,h*.04*(reduced?1:1+age),0,Math.PI*2);c.stroke()}
  else{
   for(let j=0;j<8;j++){const a=j*Math.PI/4,d=h*(.035+(reduced?0:age*.09));line([[x+Math.cos(a)*d,y+Math.sin(a)*d],[x+Math.cos(a)*(d+6),y+Math.sin(a)*(d+6)]],j%2?'#ffe17a':colors[(e.player??1)-1],3)}
   c.fillStyle=paper;c.strokeStyle=ink;c.lineWidth=4;c.font=`bold ${Math.max(18,h*.045)}px "Motion Hand", cursive`
   const label=`+${e.points}`,ty=y-h*.06-(reduced?0:age*h*.04);c.strokeText(label,x,ty);c.fillText(label,x,ty)
  }
  c.globalAlpha=1
 }
}
