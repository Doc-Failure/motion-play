import play from '../assets/home/play-icon.webp'
import trophy from '../assets/home/trophy-icon.webp'
import catalog from '../assets/home/catalog-icon.webp'
import settings from '../assets/home/settings-icon.webp'
import camera from '../assets/home/camera-callout.webp'
import players from '../assets/home/players-callout.webp'

const icons = {play,trophy,cards:catalog,gear:settings,camera,players}
export type PackIconName = keyof typeof icons
export function PackIcon({name}: {name:PackIconName}) {
  return <img className={`ui-pack-icon ui-pack-icon--${name}`} src={icons[name]} alt="" aria-hidden="true" width="112" height="112" decoding="async" />
}
