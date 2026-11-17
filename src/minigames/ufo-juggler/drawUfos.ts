import type {UfoSnapshot} from './UfoModel'
export function drawUfos(c:CanvasRenderingContext2D,s:UfoSnapshot,player:number,w:number,h:number,reduced:boolean){
 c.clearRect(0,0,w,h);const time=s.elapsed/1000,t=reduced?0:time,ink='#30334f'
 const line=(points:number[][],color:string,width=2)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}
 const ellipse=(x:number,y:number,rx:number,ry:number,color:string,outline=true)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();if(outline){c.strokeStyle=ink;c.lineWidth=2;c.stroke()}}
 const label=(text:string,x:number,y:number,color='#fff0b8',size=18)=>{c.font=`bold ${size}px "Motion Hand"`;c.textAlign='center';c.strokeStyle=ink;c.lineWidth=4;c.strokeText(text,x,y);c.fillStyle=color;c.fillText(text,x,y)}
 c.lineCap='round';c.lineJoin='round';c.fillStyle='#20244b18';c.fillRect(0,0,w,h)
 for(let i=0;i<14;i++){const x=((i*139+61)%997)/997*w,y=(.16+(i%6)*.12)*h;c.globalAlpha=.35+(Math.sin(t+i)+1)*.12;line([[x-3,y],[x+3,y]],'#fff4c4',1);line([[x,y-3],[x,y+3]],'#fff4c4',1)}c.globalAlpha=1
 // Chalk orbit and launch pads frame the camera rather than replacing it.
 c.setLineDash([6,9]);line([[w*.06,h*.19],[w*.94,h*.19]],'#bce6e3');c.setLineDash([])
 label('ORBIT',w*.5,h*.18,'#c5f1e6',Math.max(12,Math.min(17,w*.07)))
 for(const x of [.25,.5,.75]){ellipse(w*x,h*.96,w*.11,h*.012,'#a9a3ca');line([[w*x-w*.07,h*.952],[w*x+w*.07,h*.952]],'#fce1a7',3)}
 for(const ship of s.ships.filter(v=>v.playerId===player)){
  const r=Math.min(h*.11,w*.23),x=ship.x*w,age=(s.elapsed-ship.ended)/900,launch=ship.state==='launched',crash=ship.state==='crashed'
  const y=ship.y*h-(launch&&!reduced?age*age*h*.65:0),hot=ship.spin>1.05||s.elapsed<ship.coolUntil,danger=ship.y>.78&&ship.spin<.38,coast=ship.spin>=.8
  if((launch||crash)&&age>=1)continue
  c.save();if(launch||crash)c.globalAlpha=1-age
  if(crash){for(let j=0;j<9;j++){const a=j*Math.PI*2/9,d=r*(.4+(reduced?0:age)*1.8);ellipse(x+Math.cos(a)*d,y+Math.sin(a)*d,r*.1,r*.06,j%2?'#c0b4e4':'#ffe4a8',false)}label('−1 life',x,y-r,'#ffc3a7',Math.max(14,r*.3));c.restore();continue}
  if(ship.spin>.38||launch){
   const length=r*(launch?2.7:.3+ship.spin*.55),flicker=reduced?1:1+Math.sin(t*23+ship.id)*.1
   c.fillStyle=hot?'#f2a27e80':'#96e7e580';c.beginPath();c.moveTo(x-r*.4,y+r*.15);c.lineTo(x,y+r*.3+length*flicker);c.lineTo(x+r*.4,y+r*.15);c.fill()
   for(let j=0;j<3;j++){const tail=(t*2+j/3)%1;ellipse(x+(j-1)*r*.13,y+r*.45+tail*length,r*.04,r*.09,'#fff0bb',false)}
  }
  c.translate(x,y);const born=reduced?1:Math.min(1,(s.elapsed-ship.born)/350+.05);c.scale(born,born);c.rotate(reduced?0:Math.sin(t*(hot?15:3)+ship.id)*(hot?.12:ship.spin<.38?.15:.025))
  // Glass dome, antenna and an expressive little pilot.
  ellipse(0,-r*.25,r*.56,r*.57,'#b7e8ebdf');ellipse(0,-r*.24,r*.28,r*.32,'#b8d78b')
  line([[0,-r*.5],[r*.08,-r*.67]],ink,2);ellipse(r*.08,-r*.69,r*.055,r*.055,'#f6ca6c')
  for(const ex of [-.11,.11])ellipse(ex*r,-r*.29,r*.038,r*(hot?.07:.06),ink,false)
  if(hot||danger)ellipse(0,-r*.13,r*.055,r*.07,ink,false)
  else{c.strokeStyle=ink;c.lineWidth=2;c.beginPath();c.arc(0,-r*.2,r*.1,.2,Math.PI-.2);c.stroke()}
  line([[-r*.4,-r*.46],[-r*.3,-r*.59]],'#ffffffb0',4)
  ellipse(0,r*.05,r,r*.28,['#b4a2db','#e9b07c','#91cfd0'][ship.id%3]);ellipse(0,-r*.02,r,r*.2,hot?'#f4bc92':'#ded7ec')
  const angle=reduced?0:ship.angle
  for(let i=0;i<7;i++){const a=angle+i*Math.PI*2/7,px=Math.cos(a)*r*.8,py=Math.sin(a)*r*.12;ellipse(px,py,r*.055,r*.03,Math.sin(a)>0?'#fff0b3':'#897baf',false)}
  // Crayon hatching on the metal rim.
  for(let j=0;j<5;j++)line([[-r*.7+j*r*.1,r*.16],[-r*.62+j*r*.1,r*.1]],'#817394',1)
  if(hot){for(let j=0;j<3;j++){const rise=reduced?.5:(t+j*.3)%1;c.globalAlpha=(1-rise)*.5;ellipse((j-1)*r*.35,-r*(.7+rise*.5),r*.12,r*.1,'#eee5dd',false)}c.globalAlpha=1}
  c.restore()
  if(launch){label(`+${ship.points} SAVED!`,x,ship.y*h+r*.6,'#bff1df',Math.max(14,Math.min(24,r*.36)));continue}
  const size=Math.max(12,Math.min(18,r*.3)),text=s.elapsed<ship.coolUntil?'COOLING':hot?'TOO HOT!':danger?'SAVE ME!':coast?'COAST':'WAVE'
  label(text,x,y+r*.78,hot||danger?'#ffd0ac':'#d6f4dd',size)
  // Spin meter has a marked safe band and a moving needle, not color alone.
  const bar=r*1.45,bx=x-bar/2,by=y+r*.43
  line([[bx,by],[bx+bar,by]],ink,7);line([[bx+bar*.25,by],[bx+bar*.7,by]],'#b6e0bf',5)
  const needle=bx+bar*Math.min(1,ship.spin/1.5);line([[needle,by-4],[needle,by+4]],'#fff1bc',2)
  if(ship.cue==='save'&&s.elapsed-ship.cueAt<650)label('CLOSE SAVE +10',x,y-r,'#fff0b8',size)
 }
 const lives=s.lives[player-1];label(lives?'♥'.repeat(lives)+'♡'.repeat(3-lives):'OUT',w*.5,h*.88,'#fff0b8',Math.max(14,Math.min(22,w*.09)))
}
