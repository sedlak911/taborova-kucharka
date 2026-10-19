import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { startDevReload } from './devReload'
// self-hosted fonty: latin (ASCII, á é í ó ú ý) + latin-ext (č ř š ž ě ů)
import '@fontsource/eb-garamond/latin-400.css'
import '@fontsource/eb-garamond/latin-ext-400.css'
import '@fontsource/eb-garamond/latin-700.css'
import '@fontsource/eb-garamond/latin-ext-700.css'
import '@fontsource/eb-garamond/latin-400-italic.css'
import '@fontsource/eb-garamond/latin-ext-400-italic.css'
import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-ext-400.css'
import '@fontsource/ibm-plex-sans/latin-600.css'
import '@fontsource/ibm-plex-sans/latin-ext-600.css'
import '@fontsource/special-elite/latin-400.css'
import '@fontsource/special-elite/latin-ext-400.css'
import '@fontsource/caveat/latin-400.css'
import '@fontsource/caveat/latin-ext-400.css'
import '@fontsource/caveat/latin-700.css'
import '@fontsource/caveat/latin-ext-700.css'
import './styles/global.css'
import './styles/paper.css'
import './styles/book.css'
import './styles/typography.css'
import './styles/themes.css'
import './styles/custom.css'
import './styles/print.css'

startDevReload()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
