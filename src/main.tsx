import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { isMobileDevice } from './app/mobileDevice'
import './analytics'

const experience = isMobileDevice() ? import('./mobile/BugStack') : import('./app/DesktopApp')
void experience.then(({ default: App }) => {
  const root = document.getElementById('root')
  if (!root) throw new Error('Missing application root')
  createRoot(root).render(<StrictMode><App /></StrictMode>)
})
