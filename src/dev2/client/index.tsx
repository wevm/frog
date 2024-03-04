import { render } from 'hono/jsx/dom'

import { App } from '../components/App.js'
import { Context, valueKey } from '../lib/context.js'

const value = JSON.parse(document.getElementById(valueKey)?.textContent ?? '{}')
const root = document.getElementById('root')!

render(
  <Context.Provider value={value}>
    <App />
  </Context.Provider>,
  root,
)
