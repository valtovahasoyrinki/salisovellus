import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import { bootstrap } from '@/app/bootstrap'
import '@/styles/index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Juurielementtiä #root ei löytynyt')

await bootstrap()

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
