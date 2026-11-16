import type { ReactNode } from 'react'

const star = <path d="m50 12 10 25 27 3-20 18 6 27-23-14-24 13 7-27-19-18 27-2Z" fill="#ffe17a" />
const drawings: Record<string,ReactNode> = {
  'rocket-rumble': <><path d="m38 30 12-20 13 20v43H38Z" fill="#f8a4cf"/><path d="m38 58-14 20 14-6m25-14 14 20-14-6" fill="#72e4ef"/><path d="m43 79 7 15 7-15M16 17v20m-10-10h20m57 10v20m-10-10h20" stroke="#f5c847"/><circle cx="50" cy="45" r="8" fill="#fff2d6"/></>,
  'ninja-training': <><path d="m26 23 13-14 12 11 22-6 13 18-5 28-28 11-28-15Z" fill="#477f8e"/><path d="m30 34 47-5 2 16-46 5Z" fill="#fff2c9"/><path d="m38 40 7 1m16-3 8-2"/><path d="m23 64 58 2-2 23-56-2Z" fill="#477f8e"/><path d="m22 73 59 2-2 8-56-2Z" fill="#f3c966"/><path d="m79 56 17-9-5 23-15-3" fill="#f3c966"/></>,
  'bubble-battle': <><circle cx="43" cy="52" r="27" fill="#a1e1ef"/><circle cx="75" cy="26" r="14" fill="#d8c4ef"/><path d="M28 43q1-10 12-11M68 21l3-3" stroke="#fffdf5" strokeWidth="7"/></>,
  'whack-a-mole': <><ellipse cx="50" cy="78" rx="36" ry="11" fill="#725640"/><path d="M26 75V46c0-35 49-35 49 0v29" fill="#b98a62"/><path d="M37 47h1m24 0h1" strokeWidth="7"/><ellipse cx="50" cy="61" rx="14" ry="10" fill="#ebc5a0"/><path d="m45 61 5 4 5-4"/></>,
  'meteor-smash': <><path d="m17 70 40-55-7 28 31-27-15 42 24-9-36 37Z" fill="#ffd36c"/><circle cx="36" cy="67" r="23" fill="#cd8064"/><path d="m27 57 8-4m5 19 6-3"/></>,
  'balloon-panic': <><path d="M45 75q-10 12 0 22"/><ellipse cx="45" cy="40" rx="26" ry="33" fill="#ef8299"/><path d="m40 74 5-7 6 8Z" fill="#ef8299"/><path d="m30 31 4-9" stroke="#fffdf5" strokeWidth="6"/></>,
  'gold-rush': <><circle cx="41" cy="55" r="29" fill="#ffd25c"/><circle cx="41" cy="55" r="21" fill="none"/><path d="m41 41 4 9 10 1-8 6 3 10-9-5-8 5 2-10-7-6 10-1Z" fill="#bd8339"/><circle cx="77" cy="24" r="12" fill="#ffd25c"/></>,
  'fruit-catcher': <><path d="m19 59 8 27h49l9-27Z" fill="#d9a369"/><path d="M35 64v16m17-16v16m16-16v16"/><path d="M44 44C8 55 8 10 30 20c15-12 34 3 14 24Z" fill="#ee7e68"/><path d="m32 20 3-11"/><circle cx="72" cy="30" r="16" fill="#ffb35d"/></>,
  'fish-frenzy': <><path d="m10 34 23 18-23 17 3-17Zm22 18c14-35 49-30 59 0-15 30-47 31-59 0Z" fill="#89c7dc"/><circle cx="74" cy="46" r="3" fill="#29313c"/><path d="m50 39-6 13 7 12"/></>,
  'window-wipe': <><path d="M15 16h69v69H15Z" fill="#b2dfec"/><path d="M50 17v67M16 50h68"/><path d="m31 72 41-43 12 13-42 42Z" fill="#ffe17a"/><path d="m25 31 7 5m37 33 7 5" stroke="#b18b66" strokeWidth="7"/></>,
  'paint-splash': <><path d="m24 84 38-42 13 12-39 42Z" fill="#f4c367"/><path d="M59 43c-2-27 25-12 24-35 23 24 7 52-13 48Z" fill="#b58ad7"/></>,
  'air-pong': <><ellipse cx="43" cy="39" rx="29" ry="31" fill="#ee8d7e"/><path d="m39 67 3 26h13l-7-27" fill="#e6ba7d"/><circle cx="83" cy="65" r="10" fill="#fffdf5"/></>,
  'goalkeeper': <><path d="M12 83V21h75v62M20 24v53m16-53v53m16-53v53m16-53v53M14 39h70M14 58h70" stroke="#7c9e8a"/><circle cx="51" cy="62" r="24" fill="#fffdf5"/><path d="m48 47 13 8-5 14-15-1-4-13Z" fill="#29313c"/></>,
  'car-wash': <><path d="m10 70 4-24 15-4 13-22h28l15 24 8 4-3 22Z" fill="#8dc9de"/><path d="m37 41 8-14h20l10 14Z" fill="#e5f4f5"/><circle cx="28" cy="72" r="10" fill="#4b5261"/><circle cx="75" cy="72" r="10" fill="#4b5261"/><path d="m19 17 4 8 9 2-9 3-3 9-3-9-9-3 10-3Z" fill="#ffe17a"/></>,
  'pizza-maker': <><path d="M14 18q68-14 74 62L47 94Z" fill="#e3aa61"/><path d="M24 27q47-4 53 48L48 82Z" fill="#ffe093"/><circle cx="42" cy="43" r="8" fill="#e87f6b"/><circle cx="57" cy="65" r="8" fill="#e87f6b"/></>,
  'treasure-grab': <><path d="M15 45q3-33 36-31 32-1 35 31v39H15Z" fill="#c79665"/><path d="M16 46h69M31 20v62m41-61v62"/><path d="M43 41h17v20H43Z" fill="#ffe17a"/></>,
  'supermarket-rush': <><path d="m8 17 13 4 10 46h47l10-35H25" fill="#a6d6de"/><path d="M43 34v24m20-24v24M26 45h57"/><circle cx="38" cy="82" r="7" fill="#29313c"/><circle cx="72" cy="82" r="7" fill="#29313c"/></>,
  'simon-says': <><path d="M15 15h30v30H15Z" fill="#ef8d7e"/><path d="M55 15h30v30H55Z" fill="#95cbe1"/><path d="M15 55h30v30H15Z" fill="#ffe17a"/><path d="M55 55h30v30H55Z" fill="#a4c995"/></>,
  'plate-spinner': <><ellipse cx="49" cy="31" rx="36" ry="13" fill="#c5b3e1"/><ellipse cx="49" cy="28" rx="24" ry="6" fill="#fffdf5"/><path d="m49 44 2 49M17 70l-6 9m70-10 7 8"/></>,
  'monster-defense': <><path d="m25 29-6-17 21 13 21-2 18-14-4 24q24 54-22 53-47 0-28-57Z" fill="#a6ca8e"/><circle cx="39" cy="45" r="6" fill="#fffdf5"/><circle cx="64" cy="45" r="6" fill="#fffdf5"/><path d="M38 64q13 12 26-1"/></>,
  'pinata-party': <><path d="m50 10 12 24 29 6-20 20 2 29-24-14-27 12 6-28L8 38l29-4Z" fill="#ef93b1"/><path d="m26 39 46 17m-39 2 27 11" stroke="#ffe17a" strokeWidth="10"/></>,
  'graffiti-race': <><path d="M28 34h42v56H28Z" fill="#a78cd2"/><path d="M37 22h24v12H37Zm8-11h9v11" fill="#ffe17a"/><path d="m64 16 20-9m-19 16 25-2" stroke="#ee8d9a"/></>,
}
export function GameDoodle({slug}: {slug:string}) {
  return <svg className="game-doodle" viewBox="0 0 100 100" fill="none" stroke="#29313c" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawings[slug] ?? star}</svg>
}
