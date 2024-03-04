import { render } from 'hono/jsx/dom'

import { Provider, dataId } from '../lib/context.js'
import { App } from '../components/App.js'

const value = JSON.parse(document.getElementById(dataId)!.textContent!)

render(
  <Provider {...value}>
    <App />
  </Provider>,
  document.getElementById('root')!,
)
