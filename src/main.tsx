import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/App'
import './analytics'
import './styles.css'
import './game/game-polish.css'
import './game/keyboard-play.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Missing application root')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import './game/camera-play.css'
import './design/typography.css'
