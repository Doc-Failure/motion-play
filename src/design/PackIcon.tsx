import play from '../assets/home/play-icon.webp'
import trophy from '../assets/home/trophy-icon.webp'
import catalog from '../assets/home/catalog-icon.webp'

const icons = {play,trophy,cards:catalog}
export type PackIconName = keyof typeof icons
export function PackIcon({name}: {name:PackIconName}) {
  return <img className={`ui-pack-icon ui-pack-icon--${name}`} src={icons[name]} alt="" aria-hidden="true" width="112" height="112" decoding="async" />
}
