import { render } from 'hono/jsx/dom'

import { App } from './App.js'
import { Provider, dataId } from './lib/context.js'

import './styles.css'

const element = document.getElementById(dataId)
const value = JSON.parse(element!.textContent!)

render(
  <Provider {...value}>
    <App />
  </Provider>,
  document.getElementById('root')!,
)

element?.remove()
