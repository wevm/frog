import { render } from 'hono/jsx/dom'

import { Provider, dataId } from '../lib/context.js'
import { App } from '../components/App.js'

const element = document.getElementById(dataId)
const value = JSON.parse(element!.textContent!)

render(
  <Provider {...value}>
    <App />
  </Provider>,
  document.getElementById('root')!,
)

element?.remove()
