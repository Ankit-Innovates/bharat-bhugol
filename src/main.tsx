import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/plus-jakarta-sans/wght.css'
import './styles/tokens.css'
import App from './App.tsx'

const root = document.getElementById('root')
if (!root) throw new Error('The page has no #root element.')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
