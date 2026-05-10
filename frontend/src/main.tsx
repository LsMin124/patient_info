import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'

import './styles/reset.css'
import './styles/tokens.css'
import './styles/global.css'
import './shared/ui/components.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found in index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
