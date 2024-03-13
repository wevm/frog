import React from 'react'
import ReactDOM from 'react-dom/client'

import { App } from './App.tsx'
import { initFrogClient } from './frog-client.ts'
import { store } from './lib/store.ts'
import { Data } from './types/frog.ts'

import '@fontsource-variable/inter'
import './assets/icon.png'
import './index.css'
import 'virtual:uno.css'

const dataElement = document.getElementById('__FROG_DATA__')
const bootstrap = JSON.parse(dataElement!.textContent!) as
  | { data: Data; routes: string[] }
  | undefined

if (bootstrap) {
  const { data, routes } = bootstrap
  const { id: initialDataKey } = data

  store.setState((state) => ({
    ...state,
    dataKey: initialDataKey,
    dataMap: { [initialDataKey]: data },
    logs: [initialDataKey],
    routes,
    stack: [initialDataKey],
  }))
}
dataElement?.remove()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

initFrogClient()
