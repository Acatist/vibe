import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@components/ui/ThemeProvider'
import App from './App'
import '@styles/globals.css'

const container = document.getElementById('root')!
createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
