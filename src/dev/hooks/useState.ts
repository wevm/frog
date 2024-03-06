import { useContext } from 'hono/jsx/dom'

import { StateContext } from '../lib/context.js'

export function useState() {
  return useContext(StateContext)
}
