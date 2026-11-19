/* global document -- evaluated inside the local Playwright canvas page */
// Original local stick-figure tutorials. No camera images or external assets.
import {chromium} from '@playwright/test'
import {spawn} from 'node:child_process'
import {mkdir} from 'node:fs/promises'
import {resolve} from 'node:path'
const directory=resolve('src/assets/intros');await mkdir(directory,{recursive:true})
const browser=await chromium.launch({headless:true}),page=await browser.newPage()
await page.setContent('<canvas width="320" height="180"></canvas>')
for(const game of (process.env.INTRO_GAME?[process.env.INTRO_GAME]:['bubble-battle','ninja-training','window-wipe','rocket-rumble','beat-freak','punch-arena','keep-ups','ghost-catcher','ufo-juggler','jump-rush','six-hoops','goalkeeper','net-rally','kangaroo-race','marble-bowling','shadow-snap'])){
 const frames=await page.evaluate(game=>{
  const canvas=document.querySelector('canvas'),c=canvas.getContext('2d'),output=[]
  const line=(points,color='#29313c',width=5)=>{c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}
  const circle=(x,y,r,color,outline='#29313c')=>{c.fillStyle=color;c.strokeStyle=outline;c.lineWidth=2;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.stroke()}
  for(let frame=0;frame<72;frame++){
   const t=frame/72,phase=frame%18/18,beat=Math.floor(frame/18),s=Math.sin(t*Math.PI*4)
   c.fillStyle='#fff';c.fillRect(0,0,320,180)
   let center=160,left=[115,95],right=[205,95]
   if(game==='shadow-snap'){
    const lift=Math.min(1,t*1.7)
    const figure=(pose,color)=>{
     circle(160,47,13,color,color);line([[160,60],[160,105]],color,24)
     for(const sign of [-1,1]){
      line([[160+sign*8,70],[160+sign*27,68-15*pose],[160+sign*38,92-66*pose]],color,12)
      line([[160+sign*5,105],[160+sign*13,139],[160+sign*18,156]],color,13)
     }
    }
    c.fillStyle='#fff';c.fillRect(0,0,320,180)
    figure(1,'#534552')
    figure(lift,lift===1?'#73bcaa':'#bb6654')
    if(lift===1)line([[219,73],[229,84],[247,61]],'#187751',6)
    output.push(canvas.toDataURL('image/png').split(',')[1]);continue
   }else if(game==='marble-bowling'){
    center=82;left=[58,107]
    const sweep=Math.max(0,Math.min(1,(t-.18)*4)),roll=Math.max(0,Math.min(1,(t-.40)*2.9))
    right=[119+12*sweep,130-65*sweep]
    line([[175,150],[195,40],[267,40],[286,150]],'#c7a26b',4)
    for(const [x,y] of [[219,63],[241,63],[230,73]]){
     c.save();c.translate(x,y);c.rotate(Math.max(0,Math.min(1,(t-.72)*7))*(x<230?-1:1)*1.25)
     line([[0,0],[0,-10]],'#393242',10);line([[0,0],[0,-10]],'#fff5da',6);line([[-2,-7],[2,-7]],'#de6556',2);c.restore()
    }
    circle(230,135-66*roll,8,'#70d5db')
   }else if(game==='goalkeeper'){
    center=105;const bx=235-100*t,by=35+110*t;right=[140+(bx-140)*t,95+(by-95)*t]
    circle(235,15,7,'#e8b986');line([[235,23],[235,40]],'#ed705e',9);line([[232,40],[226,52]],'#29313c',4);line([[238,40],[249,45+Math.sin(t*Math.PI)*8]],'#29313c',4)
    circle(bx,by,5+t*7,'#fff6df');circle(bx,by,2+t*3,'#29313c')
   }else if(game==='net-rally'){
    center=95;left=[65,100];right=[135,80];line([[220,80],[220,165]],'#72b779',6);circle(130+t*160,95-Math.sin(t*Math.PI)*65,10,'#ffe17a')
   }else if(game==='six-hoops'){
    for(const x of [28,292])for(const y of [50,95,140]){line([[x-15,y],[x-10,y+18],[x+10,y+18],[x+15,y]],'#72b779',2);line([[x-15,y],[x+15,y]],'#f28c46',4)}
    center=150;left=[115,95];right=[195,85];const contact=.35;
    const x=t<contact?160:160+(292-160)*(t-contact)/(1-contact),y=t<contact?8+t/contact*25:33+(95-33)*(t-contact)/(1-contact)-Math.sin((t-contact)/(1-contact)*Math.PI)*35;
    circle(x,y,9,'#f5a052');line([[x-8,y],[x+8,y]],'#29313c',1)
    }else if((game==='jump-rush'||game==='kangaroo-race')){
    center=100;left=[75,95];right=[125,95]
    const hop=Math.max(0,Math.sin((t-.25)*Math.PI*3))*35,ky=117-hop
    line([[215,ky],[185,ky+22],[165,ky+25]],'#b87f4a',9)
    circle(211,ky-3,15,'#d7a16a');line([[216,ky+9],[232,ky+20],[208,ky+20]],'#d7a16a',9)
    line([[220,ky-28],[215,ky-53],[225,ky-35],[235,ky-52]],'#d7a16a',6)
    circle(225,ky-28,12,'#d7a16a');circle(235,ky-25,7,'#d7a16a');circle(229,ky-31,2,'#29313c')
    c.fillStyle='#29313c';c.font='12px sans-serif';c.fillText('YOU',199,173)

    const x=290-t*300;line([[20,155],[300,155]],'#72b779',4);line([[x,153],[x,123],[x+25,123],[x+25,153]],'#efb56f',6)
   }else if(game==='ufo-juggler'){
    const x=235,y=105-t*80,spin=t<.45||t>.7
    if(spin)right=[x+Math.sin(t*Math.PI*24)*15,y+8];else right=[205,110]
    c.fillStyle='#b7e8eb';c.strokeStyle='#30334f';c.lineWidth=2;c.beginPath();c.ellipse(x,y-8,12,14,0,0,Math.PI*2);c.fill();c.stroke();circle(x,y-8,5,'#b8d78b');c.fillStyle='#b4a2db';c.beginPath();c.ellipse(x,y+3,25,8,0,0,Math.PI*2);c.fill();c.stroke()
    line([[x,y+12],[x,y+25]],'#f5c847',4);line([[205,18],[270,18]],'#91cfd0',2)
    c.fillStyle='#30334f';c.font='12px sans-serif';c.textAlign='center';c.fillText(spin?'WAVE':'COAST',235,151)
   }else if(game==='ghost-catcher'){
    const x=235,y=65,r=18+phase*9;right=[x+Math.sin(t*Math.PI*16)*12,y+Math.cos(t*Math.PI*16)*12];left=[125,95]
    if(phase<.85){c.fillStyle='#c6e9de';c.strokeStyle='#49385e';c.lineWidth=3;c.beginPath();c.arc(x,y,r,Math.PI,0);c.lineTo(x+r,y+r);c.lineTo(x,y+r*.7);c.lineTo(x-r,y+r);c.closePath();c.fill();c.stroke();circle(x-6,y,2,'#49385e');circle(x+6,y,2,'#49385e')}
    else for(let j=0;j<8;j++){const a=j*Math.PI/4;circle(x+Math.cos(a)*32,y+Math.sin(a)*32,3,'#f5c847')}
   }else if(game==='keep-ups'){
    center=160+Math.sin(t*Math.PI*2)*35;const y=30-Math.sin(t*Math.PI*4)**2*20
    circle(center,y,10,'#fff6df');circle(center,y,4,'#29313c');left=[center-30,74];right=[center+30,74];line([[25,158],[295,158]],'#72b779',4)
   }else if(game==='punch-arena'){

    center=105;c.fillStyle='#dcaa7c';c.strokeStyle='#29313c';c.lineWidth=3;c.fillRect(213,42,46,43);c.strokeRect(213,42,46,43);c.fillRect(209,87,52,54);c.strokeRect(209,87,52,54);line([[221,58],[251,58]],'#29313c',8);circle(206,93,14,'#ed8b7d');circle(265,93,14,'#bfa6e4')
    if(t<.55){right=[140+Math.sin(t/.55*Math.PI*2)**2*90,65];left=[80,75]}else{center=80;left=[65,110];right=[115,110];circle(175-(t-.55)*150,65,19,'#ed8b7d');line([[55,77],[90,77]],'#efb56f',5)}
   }else if(game==='window-wipe'){

    c.strokeStyle='#7ba5b0';c.lineWidth=3;c.strokeRect(35,13,250,149)
    for(let i=0;i<14;i++)circle(50+i%7*36,39+Math.floor(i/7)*70,17,'#c5e4eb','#c5e4eb')
    left=[95+s*35,80+Math.cos(t*Math.PI*4)*30];right=[225-s*35,80+Math.cos(t*Math.PI*4)*30]
    line([[70,75],[115,55],[85,110]],'#fff',16);line([[215,75],[250,95],[220,120]],'#fff',16)
   }else if(game==='beat-freak'){
    const turn=Math.floor(t*2),progress=t*2-turn,pads=[66,254],x=pads[turn]
    pads.forEach((px,i)=>{c.fillStyle=i?'#e99eb2':'#eea67b';c.strokeStyle='#29313c';c.lineWidth=3;c.fillRect(px-23,60,46,46);c.strokeRect(px-23,60,46,46);circle(px,83,14,'#fff6df')})
    c.fillStyle=progress>.53?'#ffe17a':'#fff6df';c.fillRect(x-39,29,78,23);c.strokeRect(x-39,29,78,23)
    c.fillStyle='#29313c';c.textAlign='center';c.font='bold 14px sans-serif';c.fillText(progress>.53?'HIT!':'Get ready',x,46)
    const reach=Math.max(0,Math.min(1,(progress-.53)*7,(1-progress)*7)),rest=turn?204:116,hand=[rest+(x-rest)*reach,93-10*reach]
    if(turn)right=hand;else left=hand
   }else if(game==='rocket-rumble'){
    for(const x of [76,244]){c.fillStyle='#f5cf70';c.strokeStyle='#29313c';c.lineWidth=2;c.beginPath();c.moveTo(x-9,66);c.lineTo(x,47);c.lineTo(x+9,66);c.lineTo(x+8,90);c.lineTo(x-8,90);c.closePath();c.fill();c.stroke()}
    c.fillStyle='#7ba5b0';c.fillRect(146,138,28,13);line([[160,138],[160,119]],'#29313c',4);line([[149,118],[172,118]],'#ef9eab',7)
    if(beat===0)left=[76,70];else if(beat===1)right=[244,70];else{left=[155,115+phase*18];right=[166,115+phase*18]}
    if(beat===3)for(let i=0;i<8;i++){const a=i*Math.PI/4;line([[160+Math.cos(a)*20,44+Math.sin(a)*20],[160+Math.cos(a)*(25+phase*20),44+Math.sin(a)*(25+phase*20)]],'#edb75f',3)}
   }else{
    const target=beat%2===0?[68,70]:[252,70],reach=Math.sin(phase*Math.PI)
    if(game==='ninja-training'){center=160+Math.sin(t*Math.PI*2)*14;c.fillStyle='#71a8b2';c.strokeStyle='#29313c';c.fillRect(target[0]-9,target[1]-12,18,24);c.strokeRect(target[0]-9,target[1]-12,18,24);line([[target[0]-5,target[1]-4],[target[0]+5,target[1]-4]],'#fff4d8',4)}
    else circle(target[0],target[1],14,'#a5dfe9')
    const hand=[center+(target[0]-center)*reach,90+(target[1]-90)*reach];if(beat%2===0)left=hand;else right=hand
    if(reach>.95){line([[target[0]-15,target[1]-17],[target[0]-22,target[1]-23]],'#f4ba5c',3);line([[target[0]+15,target[1]-17],[target[0]+22,target[1]-23]],'#f4ba5c',3)}
   }
   if(game==='punch-arena'&&t>=.55)c.translate(0,25)
   if((game==='jump-rush'||game==='kangaroo-race'))c.translate(0,-Math.max(0,Math.sin((t-.25)*Math.PI*3))*35)
   circle(center,48,12,'#fff6df');line([[center,61],[center,113]]);line([[center,77],[center-18,85],left]);line([[center,77],[center+18,85],right]);line([[center,113],[center-15,147]]);line([[center,113],[center+15,147]])
   circle(...left,4,'#efb56f');circle(...right,4,'#efb56f')
   if(game==='punch-arena'&&t>=.55)c.translate(0,-25)
   if((game==='jump-rush'||game==='kangaroo-race'))c.resetTransform()
   output.push(canvas.toDataURL('image/png').split(',')[1])
  }
  return output
 },game)
 const child=spawn(process.env.FFMPEG_PATH??'ffmpeg',['-loglevel','error','-y','-f','image2pipe','-framerate','24','-i','pipe:0','-an',...(['marble-bowling','shadow-snap'].includes(game)?['-vf','fps=12,scale=192:108']:[]),'-c:v','libx264','-preset','slow','-crf',game==='marble-bowling'?'34':'30','-pix_fmt','yuv420p','-movflags','+faststart',resolve(directory,`${game}.mp4`)],{stdio:['pipe','inherit','inherit']})
 for(const frame of frames)if(!child.stdin.write(Buffer.from(frame,'base64')))await new Promise(resolve=>child.stdin.once('drain',resolve))
 child.stdin.end();await new Promise((resolve,reject)=>child.once('exit',code=>code===0?resolve():reject(new Error(`ffmpeg ${code}`))))
 process.stdout.write(`${game}: rendered 3 second tutorial\n`)
}
await browser.close()
