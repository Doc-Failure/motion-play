import sunClouds from '../assets/home/sun-clouds.webp'
import rainbow from '../assets/home/rainbow.webp'
import titleCloud from '../assets/home/title-cloud.webp'
import leftChild from '../assets/home/left-child.webp'
import rightChild from '../assets/home/right-child.webp'

export function GeneratedHomeScene() {
  return <div className="generated-home-scene" aria-hidden="true">
    <img className="generated-sun" src={sunClouds} alt="" />
    <img className="generated-rainbow" src={rainbow} alt="" />
    <img className="generated-title-cloud" src={titleCloud} alt="" />
    <img className="generated-child generated-child--left" src={leftChild} alt="" />
    <img className="generated-child generated-child--right" src={rightChild} alt="" />
    <div className="generated-garden" />
  </div>
}
