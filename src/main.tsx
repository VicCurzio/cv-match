import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { basenameFrom } from '@/screens/routes'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {/* Real paths, not `#/`: GitHub Pages serves a copy of index.html as
          404.html, so a reload on /cv-match/editor still reaches the app. */}
      <BrowserRouter basename={basenameFrom(import.meta.env.BASE_URL)}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
