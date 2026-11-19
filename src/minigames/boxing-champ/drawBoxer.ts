import {boxingAttack,BOXING_WINDUP_MS,BOXING_CONTACT_MS,BOXING_ATTACK_END_MS} from './boxingAttack'
import {boxingGeometry,type Boxer} from './BoxingModel'
import {boxerPose} from './boxerPose'
const boxerSheet=new Image()
boxerSheet.src=`${import.meta.env.BASE_URL}assets/minigames/cardboard-champ/boxer-poses.webp`
/** Original articulated paper robot. Artwork and collision share this 1000-unit plane. */
export function drawBoxer(c:CanvasRenderingContext2D,b:Boxer,time:number,reduced:boolean,aspect=1){
 const geometry=boxingGeometry(aspect)
 c.clearRect(0,0,1000,1000);c.lineJoin='round';c.lineCap='round';c.lineWidth=7;c.strokeStyle='#29313c'
 const path=(p:string,fill:string)=>{const shape=new Path2D(p);c.fillStyle=fill;c.fill(shape);c.stroke(shape)}
 const oval=(x:number,y:number,rx:number,ry:number,color:string)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();c.stroke()}
 const text=(s:string,x:number,y:number,size=30,color='#29313c',limit=700)=>{c.font=`700 ${size}px "Motion Hand", cursive`;c.textAlign='center';c.fillStyle=color;c.save();c.translate(x,y);c.scale(1/aspect,1);c.fillText(s,0,0,Math.min(900,x?x*2:limit,x?(1000-x)*2:limit)*aspect);c.restore()}
 const age=time-b.cueAt,recoil=!reduced&&age<300&&(b.cue==='hit'||b.cue==='body')?Math.sin(age/300*Math.PI)*28:0
 const attack=b.attack<0||b.health<=0?-1:time-b.attack,wind=attack>=0&&attack<BOXING_CONTACT_MS,pose=boxingAttack(attack)
 c.save();c.translate(geometry.x*1000,0);c.scale(geometry.scale,1);c.translate(-660,0)
 if(b.health<=0){const p=reduced?1:Math.min(1,(time-(b.recover-1800))/600);c.translate(660,720);c.rotate(reduced?0:p*.8);c.scale(1,Math.max(.25,1-p*.65));c.translate(-660,-720)}
 c.translate(recoil,reduced?0:Math.sin(time/190)*5)
 if(boxerSheet.complete&&boxerSheet.naturalWidth){const frame=boxerPose(b,time),size=boxerSheet.naturalWidth/2;c.drawImage(boxerSheet,frame%2*size,Math.floor(frame/2)*size,size,size,440,205,440,610)}else{
 // Boots, accordion knees, corrugated torso and tape seams.
 path('M569 670 605 670 598 775 561 774Z','#89aeb6');path('M703 668 739 674 751 770 712 778Z','#89aeb6')
 path('M541 762Q570 744 609 763L613 794 526 796Z','#bfa6e4');path('M705 762Q734 750 767 771L780 797 706 791Z','#bfa6e4')
 path('M550 458 758 451 791 656 737 707 573 701 532 650Z','#dca875')
 for(let y=490;y<670;y+=23){c.lineWidth=2;path(`M555 ${y} 756 ${y-6}`,'transparent')}c.lineWidth=7
 path('M634 461 669 459 680 700 645 700Z','#f5d694');oval(660,574,42,40,'#fff2cf');text('★',660,589,42)
 // Spring neck and separate head allow a convincing hit recoil.
 path('M631 428 689 428 686 468 636 467Z','#78cbd3')
 c.save();c.translate(660,400);c.rotate(!reduced&&b.cue==='hit'&&age<300?-recoil/90:0);c.translate(-660,-400)
 path('M548 260 761 269 779 410 743 444 567 436 538 399Z','#e9bb82')
 path('M557 286 746 291 748 350 553 347Z','#29313c')
 const blink=time%3300>3150
 oval(597,316,13,blink?2:15,b.health<=0?'#f5cf70':'#91e3dc');oval(708,318,13,blink?2:15,'#91e3dc')
 path('M603 386Q660 408 718 384L714 419 605 416Z','#fff3d9');path('M642 401 642 417M681 400 681 416','transparent')
 oval(536,354,17,26,'#78cbd3');oval(781,355,17,26,'#78cbd3');path('M659 261 660 236','transparent');oval(660,226,13,13,wind?'#ef8d72':'#78cbd3');c.restore()
 }
 // The non-attacking glove stays in guard; the lead glove is drawn in camera space.
 if(b.side===1){path('M548 493Q470 540 493 480L528 465Q535 478 562 470Z','#78cbd3');oval(493,480,65,58,'#ed8b7d')}
 else{path('M759 477Q831 502 826 400L784 398Q787 462 745 455Z','#78cbd3');oval(808,388,64,62,'#bfa6e4')}

 c.restore()
 if(b.health>0){
  const left=b.side===-1,sx=geometry.x*1000+((left?548:759)-660)*geometry.scale
  const home=geometry.x*1000+((left?493:808)-660)*geometry.scale
  const pulled=home+(sx-home)*pose.pull,gy0=(left?480:388)-pose.pull*65
  const gx=pulled+((left?350:650)-pulled)*pose.reach,gy=gy0+(380-gy0)*pose.reach
  const radius=58+pose.reach*30,rx=Math.min(150,radius/aspect)
  if(!reduced&&pose.reach>.1){c.strokeStyle='#fff2c9';c.lineWidth=9;for(const offset of [-40,0,40])path(`M${sx} ${460+offset}L${gx} ${gy+offset}`,'transparent');c.strokeStyle='#29313c'}
  path(`M${sx-18} 475Q${sx} 420 ${gx-15} ${gy}L${gx+18} ${gy+14}Q${sx+35} 490 ${sx+18} 500Z`,'#78cbd3')
  oval(gx,gy,rx,radius,left?'#ed8b7d':'#bfa6e4')
  path(`M${gx-rx*.65} ${gy+radius*.45}Q${gx} ${gy+radius*.65} ${gx+rx*.65} ${gy+radius*.45}`,'transparent')
 }

 // Foreground ropes cross the lower body so the boxer stands inside the ring.
 c.save()
 for(const y of [650,755,860]){
  c.strokeStyle='#29313c';c.lineWidth=9;path(`M30 ${y}Q500 ${y+30} 970 ${y}`,'transparent')
  c.strokeStyle='#fff0ce';c.lineWidth=3;path(`M30 ${y}Q500 ${y+30} 970 ${y}`,'transparent')
 }
 c.strokeStyle='#29313c';c.lineWidth=7
 path('M20 620 43 619 45 914 18 913Z','#78cbd3');path('M957 618 980 623 981 912 956 916Z','#efaa8c')
 c.restore()
 if(wind){text('!',geometry.x*1000,225,70,'#ffe17a');path('M160 820 840 820 838 878 162 881Z','#ffdb78');text(attack<BOXING_WINDUP_MS?'DUCK ↓  or lean away':'DUCK NOW!',500,861,34)}
 else if(b.attack>=0&&attack<BOXING_ATTACK_END_MS+450&&b.health>0){text('Your turn — punch!',500,850,38,'#fff4da')}

 if(age<800&&b.cue&&b.cue!=='windup'){
  const words={hit:`POW! +${10+Math.min(10,b.combo-1)}`,body:`THUMP! +${8+Math.min(10,b.combo-1)}`,counter:'COUNTER! +12 bonus',guard:'Guarded — aim lower',dodge:'NICE DODGE! +15',ouch:'Shake it off!',ko:'KNOCKOUT! +50'}
  if(b.cue==='hit'||b.cue==='body'){c.save();c.globalAlpha=Math.max(0,1-age/800);c.strokeStyle='#fff1b8';c.lineWidth=9;c.beginPath();c.ellipse(geometry.x*1000,460,180+(reduced?0:age*.2),130+(reduced?0:age*.14),0,0,Math.PI*2);c.stroke();c.restore()}
  c.save();c.translate(500,135);const pop=reduced?.65:.65*(1+Math.sin(Math.min(1,age/180)*Math.PI)*.15);c.scale(pop,pop)
  path('M-210-40-130-50-90-95-30-60 60-90 100-50 200-30 150 5 185 55 75 45 20 85-50 50-160 65-140 15Z',b.cue==='ouch'?'#efad94':'#ffe499');text(words[b.cue],0,10,b.cue==='guard'?25:35,'#29313c',300);c.restore()
  if(b.cue!=='guard'&&b.cue!=='ouch')for(let i=0;i<9;i++){const a=i*2.4,r=75+(reduced?30:age*.16);text('✦',500+Math.cos(a)*r,135+Math.sin(a)*Math.min(45,r*.4),24,['#ffdc71','#91e3dc','#e9a5bb'][i%3])}
 }
 if(b.combo>1)text(`${b.combo} hit streak`,660,740,28,'#fff4da')
 text(`YOU ${b.stamina}%   ·   ${b.kos} KO`,270,940,28,'#fff4da')
}
