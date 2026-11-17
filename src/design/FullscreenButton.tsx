import {useEffect,useState} from 'react'
import {createPortal} from 'react-dom'
import './fullscreen.css'
export function FullscreenButton(){
 const [active,setActive]=useState(Boolean(document.fullscreenElement)),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 useEffect(()=>{const sync=()=>{setActive(Boolean(document.fullscreenElement));setError('')};document.addEventListener('fullscreenchange',sync);return()=>document.removeEventListener('fullscreenchange',sync)},[])
 if(!document.documentElement.requestFullscreen||document.fullscreenEnabled===false)return null
 const label=active?'Exit fullscreen':'Enter fullscreen'
 const toggle=async()=>{
  setBusy(true);setError('')
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}
  catch{setError('Click or press Enter on the fullscreen button to try again.')}
  finally{setBusy(false)}
 }
 return createPortal(<><button className="fullscreen-toggle" type="button" aria-label={label} title={active?'Exit fullscreen (Esc)':label} aria-pressed={active} disabled={busy} onClick={()=>void toggle()}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={active?'M3 9h6V3m6 0v6h6M3 15h6v6m6 0v-6h6':'M9 3H3v6m12-6h6v6M3 15v6h6m6 0h6v-6'}/></svg></button>{error&&<p className="fullscreen-error" role="status">{error}</p>}</>,document.body)
}
