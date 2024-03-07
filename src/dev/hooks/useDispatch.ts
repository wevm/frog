import { useContext } from 'hono/jsx/dom'

import { DispatchContext } from '../Context.js'

export function useDispatch() {
  return useContext(DispatchContext)
}
