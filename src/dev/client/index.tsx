import { render } from 'hono/jsx/dom'

import { App } from '../components/App.js'
import { Provider, dataId } from '../lib/context.js'

const element = document.getElementById(dataId)
const value = JSON.parse(element!.textContent!)

render(
  <Provider {...value}>
    <App />
  </Provider>,
  document.getElementById('root')!,
)

element?.remove()
