import { useContext } from 'hono/jsx/dom'

import { StateContext } from '../Context.js'

export function useState() {
  return useContext(StateContext)
}
