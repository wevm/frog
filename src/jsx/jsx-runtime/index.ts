export { jsxDEV as jsx, Fragment, type JSX } from '../jsx-dev-runtime/index.js'
export { jsxDEV as jsxs } from '../jsx-dev-runtime/index.js'

import { html, raw } from 'hono/html'
export { html as jsxTemplate }
export const jsxAttr = (name: string, value: string) =>
  raw(`${name}="${html`${value}`}"`)
export const jsxEscape = (value: string) => value
