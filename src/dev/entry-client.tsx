import { render } from 'hono/jsx/dom'

import { App } from './App.js'
import { Provider, dataId } from './Context.js'

import '@fontsource-variable/inter'
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
