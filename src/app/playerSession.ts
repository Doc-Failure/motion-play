import type {PlayerCount} from '../input/PlayerZoneMapper'
const key='motion-play:players:v1'
export function loadSessionPlayers():PlayerCount|null {try{const value=Number(sessionStorage.getItem(key));return [1,2,3,4].includes(value)?value as PlayerCount:null}catch{return null}}
export function saveSessionPlayers(players:PlayerCount){try{sessionStorage.setItem(key,String(players))}catch{/* The current in-memory choice still works in private browsing. */}}
