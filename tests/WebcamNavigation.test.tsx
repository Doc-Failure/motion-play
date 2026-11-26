import {useState} from 'react'
import {act,render,screen} from '@testing-library/react'
import {it,expect,vi,afterEach} from 'vitest'
import {WebcamNavigation} from '../src/camera/WebcamNavigation'
import {WebcamMenuInput} from '../src/input/WebcamMenuInput'
afterEach(()=>vi.restoreAllMocks())
it('does not click a new dialog under a stationary hand; moving deliberately can select it',()=>{
 let now=0;vi.spyOn(performance,'now').mockImplementation(()=>now)
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){return this.tagName==='BUTTON'||this.getAttribute('role')==='dialog'?new DOMRect(100,100,200,200):new DOMRect()})
 const feed=new WebcamMenuInput(),resume=vi.fn()
 function Page(){const[paused,setPaused]=useState(false);return <>{paused?<div role="dialog" aria-label="Paused"><button onClick={()=>{resume();setPaused(false)}}>Resume</button></div>:<button onClick={()=>setPaused(true)}>Pause</button>}<WebcamNavigation feed={feed} videoRef={{current:null}} cameraView ready players={1} requesting={false} routeKey="page" onStart={()=>{}} onPose={()=>{}}/></>}
 render(<Page/>)
 const sample=(time:number,x=.2,y=.2)=>{now=time;act(()=>feed.publish({time,events:[{playerId:1,kind:'UI_POINTER',confidence:1,timestamp:time,x,y}]}))}
 sample(0,.8,.8);sample(100);sample(700);sample(1300);sample(1900);sample(2500);sample(3100)
 expect(screen.getByRole('dialog',{name:'Paused'})).toBeVisible()
 for(const t of [3200,3800,4400,5000,5600,6200])sample(t)
 expect(resume).not.toHaveBeenCalled()
 sample(6400,.28,.24);sample(7000,.28,.24);sample(7600,.28,.24);sample(8200,.28,.24);sample(8800,.28,.24);sample(9400,.28,.24)
 expect(resume).toHaveBeenCalledOnce();expect(screen.getByRole('button',{name:'Pause'})).toBeVisible()
})

it('places the hand over the actual video rectangle including its page offset',()=>{
 const feed=new WebcamMenuInput(),video=document.createElement('video')
 vi.spyOn(video,'getBoundingClientRect').mockReturnValue(new DOMRect(80,120,600,450))
 vi.spyOn(performance,'now').mockReturnValue(100)
 render(<WebcamNavigation feed={feed} videoRef={{current:null}} activeVideoRef={{current:video}} cameraView ready players={1} requesting={false} routeKey="offset" onStart={()=>{}} onPose={()=>{}}/>)
 act(()=>feed.publish({time:100,events:[{playerId:1,kind:'UI_POINTER',confidence:1,timestamp:100,x:.25,y:.4}]}))
 const marker=document.querySelector<HTMLElement>('.webcam-navigation__hand')!
 expect(parseFloat(marker.style.left)*innerWidth/100).toBeCloseTo(230)
 expect(parseFloat(marker.style.top)*innerHeight/100).toBeCloseTo(300)
})

it('uses one steady position for the visible hand and its two-second button selection',()=>{
 let now=0;vi.spyOn(performance,'now').mockImplementation(()=>now)
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue(new DOMRect(100,100,200,200))
 const feed=new WebcamMenuInput(),select=vi.fn()
 render(<><button onClick={select}>Catalog</button><WebcamNavigation feed={feed} videoRef={{current:null}} cameraView ready players={1} requesting={false} routeKey="stable" onStart={()=>{}} onPose={()=>{}}/></>)
 const publish=(time:number,x:number,y=.2)=>{now=time;act(()=>feed.publish({time,events:[{playerId:1,kind:'UI_POINTER',confidence:1,timestamp:time,x,y}]}))}
 publish(0,.8,.8);publish(100,.2)
 const first=document.querySelector<HTMLElement>('.webcam-navigation__hand')!.style.left
 for(let t=200;t<2100;t+=100){publish(t,.2+Math.sin(t)*3/innerWidth);expect(document.querySelector<HTMLElement>('.webcam-navigation__hand')!.style.left).toBe(first);expect(select).not.toHaveBeenCalled()}
 publish(2100,.2);expect(select).toHaveBeenCalledOnce()
})

it('selects multiplayer when the first detected hand is already on its button',()=>{
 let now=0;vi.spyOn(performance,'now').mockImplementation(()=>now)
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){return this.tagName==='BUTTON'?new DOMRect(100,100,200,200):new DOMRect()})
 const feed=new WebcamMenuInput(),select=vi.fn()
 render(<><button onClick={select}>2 players</button><WebcamNavigation feed={feed} videoRef={{current:null}} cameraView ready players={1} requesting={false} routeKey="players" onStart={()=>{}} onPose={()=>{}}/></>)
 for(let t=0;t<=2000;t+=100){now=t;act(()=>feed.publish({time:t,events:[{playerId:1,kind:'UI_POINTER',confidence:1,timestamp:t,x:200/innerWidth,y:200/innerHeight,pointerId:'0:15'}]}));if(t<2000)expect(select).not.toHaveBeenCalled()}
 expect(select).toHaveBeenCalledOnce()
})
