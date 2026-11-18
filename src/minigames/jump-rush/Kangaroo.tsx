/** Original crayon runner. The jersey and label identify the controlling player. */
export function Kangaroo({player,height}:{player:number;height:number}){
 const color=['#74d6df','#ed9ba5','#bfa5e7','#a5d88b'][player-1]
 return <svg viewBox="0 0 140 150" aria-label={`Your kangaroo, Player ${player}`} role="img" fill="#d7a16a" stroke="#29313c" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
  <path d="M64 97Q32 130 6 125Q38 115 49 79Z"/>
  <path d="M65 47Q44 63 49 91Q51 116 76 115L92 99 83 58Z"/>
  <path d="M68 40Q50 9 59 5Q70 4 78 34M82 35Q80 5 90 4Q99 6 93 39"/>
  <path d="M69 34Q90 27 98 45L119 53Q123 67 104 67L82 62Q61 60 69 34Z"/>
  <path d="M48 70 83 65 88 91Q65 103 48 90Z" fill={color}/>
  <path d="m80 72 18 10 11-4" fill="none"/>
  <g transform={`rotate(${-height*22} 69 108)`}><path d="M63 91Q94 90 88 113L76 125 106 130Q113 138 99 139H62L56 124"/></g>
  <circle cx="92" cy="45" r="3" fill="#29313c" stroke="none"/><path d="m116 54 4 1m-16 8 5-1"/>
  <text style={{textShadow:'none'}} x="66" y="87" textAnchor="middle" fill="#29313c" stroke="none" fontSize="17" fontFamily="Motion Hand">{player}</text>
 </svg>
}
