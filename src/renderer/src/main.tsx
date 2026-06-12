import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ProjectorPage } from './pages/ProjectorPage'

const isProjector = new URLSearchParams(window.location.search).has('projector')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isProjector ? <ProjectorPage /> : <App />}
  </StrictMode>
)
