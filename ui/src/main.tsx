import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'sonner'

import { App } from './App.tsx'
import { Providers } from './components/Providers.tsx'
import { initFrogClient } from './frog-client.ts'
import { hydrateStore } from './lib/store.ts'
import { Bootstrap } from './types/frog.ts'

import '@fontsource-variable/inter'
import './assets/icon.png'
import './index.css'

// Hydrate store from server data
{
  const element = document.getElementById('__FROG_DATA__')
  const bootstrap = JSON.parse(element!.textContent!) as Bootstrap
  hydrateStore(bootstrap)
  element?.remove()
}

// Mount app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
    <Toaster
      toastOptions={{
        classNames: {
          toast: 'bg-background-100 border-gray-100',
          title: 'text-gray-1000',
          description: 'text-gray-700',
          icon: 'text-gray-700',
        },
      }}
    />
  </React.StrictMode>,
)

// Watch for changes in development
initFrogClient()

// Remove server style
{
  const element = document.getElementById('__SSR_STYLE__')
  element?.remove()
}
