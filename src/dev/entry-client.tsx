import { render } from 'hono/jsx/dom'

import { App } from './App.js'
import { Provider, dataId } from './Context.js'

// only import fonts in dev mode, copied to output during build process
if (import.meta.env.DEV) import('@fontsource-variable/inter')
else {
  import('./styles/fonts.css')
  // only import for build process, use `entry-server.tsx` in dev mode
  import('./styles/colors.css')
  import('./styles/globals.css')
}

const element = document.getElementById(dataId)
const value = JSON.parse(element!.textContent!)

render(
  <Provider {...value}>
    <App />
  </Provider>,
  document.getElementById('root')!,
)

element?.remove()
