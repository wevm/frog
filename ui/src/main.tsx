import React from 'react'
import ReactDOM from 'react-dom/client'

import { App } from './App.tsx'
import { initFrogClient } from './frog-client.ts'
import { hydrateStore } from './lib/store.ts'
import { Bootstrap } from './types/frog.ts'

import '@fontsource-variable/inter'
import './assets/icon.png'
import './index.css'

{
  // Hydrate store from server data
  const element = document.getElementById('__FROG_DATA__')
  const bootstrap = JSON.parse(element!.textContent!) as Bootstrap
  hydrateStore(bootstrap)
  element?.remove()
}

// Mount app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Watch for changes in development
initFrogClient()
