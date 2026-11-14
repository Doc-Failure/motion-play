import type { ReactNode } from 'react'

export type ScribbleIconName = 'play' | 'cards' | 'trophy' | 'gear' | 'home'

const paths: Record<ScribbleIconName, ReactNode> = {
  play: <path d="M9 6.5 19 12 9.5 18Z" />,
  cards: <><path d="m7 6 11-2 2 13-11 2Z" /><path d="M5 8 4 20l11 1" /></>,
  trophy: <><path d="M8 5h8v5c0 3-1.8 5-4 5s-4-2-4-5Z" /><path d="M8 7H5c0 3 1 5 4 5M16 7h3c0 3-1 5-4 5M12 15v4M8 21h8" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1" /></>,
  home: <><path d="m4 11 8-7 8 7" /><path d="M6 10v10h12V10M10 20v-6h4v6" /></>,
}

export function ScribbleIcon({ name }: { name: ScribbleIconName }) {
  return <svg className="scribble-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{paths[name]}</svg>
}
