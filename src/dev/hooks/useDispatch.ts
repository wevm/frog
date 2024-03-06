import { useContext } from 'hono/jsx/dom'

import { DispatchContext } from '../lib/context.js'

export function useDispatch() {
  return useContext(DispatchContext)
}
