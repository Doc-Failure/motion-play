import type {GhostSnapshot} from './GhostModel'
export function drawGhosts(c:CanvasRenderingContext2D,s:GhostSnapshot,player:number,w:number,h:number,reduced:boolean){
 c.clearRect(0,0,w,h);const unit=Math.min(h,w*2),t=reduced?0:s.elapsed/1000
 c.fillStyle='rgba(28,22,55,.13)';c.fillRect(0,0,w,h)
 const line=(points:number[][],color:string,width=2)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}
 c.lineJoin='round';c.lineCap='round'
 // A paper garden borders the camera; the middle stays transparent.
 for(let i=0;i<8;i++){const x=w*i/7;c.fillStyle=i%2?'#62577e':'#8973a6';c.beginPath();c.roundRect(x-12,h-35-(i%3)*8,24,60,[12,12,0,0]);c.fill();line([[x-5,h-19],[x+5,h-19]],'#d0bddf')}
 c.fillStyle='#fff1bd';c.beginPath();c.arc(w*.88,h*.16,Math.min(17,w*.06),0,Math.PI*2);c.fill()
 for(let i=0;i<9;i++){const x=((i*137+39)%997)/997*w,y=(.19+(i%4)*.16)*h;c.globalAlpha=.35+(Math.sin(t*2+i)+1)*.15;c.fillRect(x,y,3,3)}c.globalAlpha=1
 for(const g of s.ghosts.filter(g=>g.playerId===player)){
  const x=g.x*w,y=g.y*h,r=Math.min(h*.095,w*.2)*(1+g.charge*.35),age=(s.elapsed-g.ended)/850,burst=reduced?0:age
  if(g.state!=='rising'){
   if(age>=1)continue;c.save();c.globalAlpha=1-age
   if(g.state==='caught'){
    for(let j=0;j<12;j++){const a=j*Math.PI/6,d=r*(.6+burst*2);c.save();c.translate(x+Math.cos(a)*d,y+Math.sin(a)*d);c.rotate(a+burst*4);c.fillStyle=['#ffe29b','#baf1df','#e2b9f4'][j%3];c.fillRect(-3,-5,6,10);c.restore()}
    c.strokeStyle='#fff3b4';c.lineWidth=3;c.beginPath();c.arc(x,y,r*(1+burst),0,Math.PI*2);c.stroke()
   }
   c.font=`bold ${Math.max(16,unit*.035)}px "Motion Hand"`;c.textAlign='center';c.strokeStyle='#302740';c.lineWidth=4;c.strokeText(g.state==='caught'?`+${g.points}${g.points>(g.bat?15:25)?' COMBO!':''}`:'−1 life',x,y-burst*30);c.fillStyle=g.state==='caught'?'#fff1bd':'#ffb7b7';c.fillText(g.state==='caught'?`+${g.points}${g.points>(g.bat?15:25)?' COMBO!':''}`:'−1 life',x,y-burst*30);c.restore();continue
  }
  const danger=g.y<.3
  if(danger){c.save();c.strokeStyle='#ffc39d';c.lineWidth=2;c.setLineDash([4,5]);c.beginPath();c.arc(x,y,r*1.4,0,Math.PI*2);c.stroke();c.setLineDash([]);c.font=`bold ${Math.max(16,r*.38)}px "Motion Hand"`;c.textAlign='center';c.fillStyle='#fff1bd';c.strokeStyle='#382d50';c.lineWidth=3;c.strokeText('!',x,y-r*1.6);c.fillText('!',x,y-r*1.6);c.restore()}
  c.save();c.translate(x,y)
  const entrance=reduced?1:Math.min(1,Math.max(.05,(s.elapsed-g.born)/240));c.scale(entrance,entrance)
  c.rotate(reduced?0:Math.sin(t*3+g.id)*.1);const wobble=reduced?1:1+Math.sin(t*(5+g.charge*15)+g.id)*g.charge*.05;c.scale(wobble,1/wobble)
  c.shadowColor='#c5b5ff';c.shadowBlur=g.charge*20;c.fillStyle=g.bat?'#baa3e0':['#fff5dc','#b9e9de','#e8c5ec'][g.id%3];c.strokeStyle=danger?'#a64731':'#382d50';c.lineWidth=Math.max(2,r*.045)
  c.beginPath()
  if(g.bat){const flap=reduced?0:Math.sin(t*16)*r*.3;c.moveTo(-r*.3,0);c.lineTo(-r*1.3,-r*.65+flap);c.quadraticCurveTo(-r*1.5,r*.5,-r*.4,r*.4);c.lineTo(0,r*.65);c.lineTo(r*.4,r*.4);c.quadraticCurveTo(r*1.5,r*.5,r*1.3,-r*.65+flap);c.lineTo(r*.3,0);c.lineTo(r*.2,-r*.6);c.lineTo(0,-r*.3);c.lineTo(-r*.2,-r*.6)}
  else{c.moveTo(-r,r*.65);c.lineTo(-r,-r*.1);c.bezierCurveTo(-r,-r*1.4,r,-r*1.4,r,-r*.1);c.lineTo(r,r*.65);for(let j=4;j>=0;j--)c.lineTo(-r+j*r*.5,r*(j%2?.45:.75))}
  c.closePath();c.fill();c.stroke();c.shadowBlur=0
  c.fillStyle='#382d50';for(const ex of [-.32,.32]){c.beginPath();c.ellipse(ex*r,-r*.15,r*.085,r*(.13+g.charge*.06),0,0,Math.PI*2);c.fill()}
  c.beginPath();c.ellipse(0,r*.2,r*(.1+g.charge*.13),r*(.06+g.charge*.2),0,0,Math.PI*2);c.fill()
  c.fillStyle='#eea7b7';c.globalAlpha=.65;for(const ex of [-.55,.55]){c.beginPath();c.ellipse(ex*r,r*.12,r*.14,r*.07,0,0,Math.PI*2);c.fill()}c.globalAlpha=1
  // Hatch marks give the cutout an imperfect crayon edge.
  for(let j=0;j<5;j++)line([[-r*.7+j*r*.07,r*.1+j*r*.08],[-r*.55+j*r*.07,r*.02+j*r*.08]],'#a9a0b1',1)
  if(g.charge>0){c.strokeStyle='#f9d26e';c.lineWidth=4;c.beginPath();c.arc(0,0,r*1.25,-Math.PI/2,-Math.PI/2+Math.PI*2*g.charge);c.stroke()}
  c.restore()
 }
 c.font=`bold ${Math.max(15,Math.min(23,w*.085))}px "Motion Hand"`;c.textAlign='center';c.fillStyle='#fff1bd';c.strokeStyle='#302740';c.lineWidth=4
 const label=s.lives[player-1]===0?'OUT':'♥'.repeat(s.lives[player-1])+'♡'.repeat(5-s.lives[player-1]);c.strokeText(label,w/2,h*.91);c.fillText(label,w/2,h*.91)
 const waveTime=s.elapsed%12000;if(waveTime<1800){c.globalAlpha=Math.min(1,(1800-waveTime)/400);const label=`Wave ${s.wave}${s.wave>1?' — faster!':''}`;c.strokeText(label,w/2,h*.24);c.fillText(label,w/2,h*.24);c.globalAlpha=1}
}
