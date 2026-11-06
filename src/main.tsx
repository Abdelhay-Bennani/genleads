import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Root from './App'
import { PublicPresentation } from './views/PublicPresentation'
import './index.css'

// Les liens de présentation partagés aux prospects (/p/<jeton>) s'affichent sans connexion.
const share = window.location.pathname.match(/^\/p\/([A-Za-z0-9_-]{20,})\/?$/)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {share ? <PublicPresentation token={share[1]} /> : <Root />}
  </StrictMode>,
)
