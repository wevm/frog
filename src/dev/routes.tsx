import { type Env, type Schema } from 'hono'
import { inspectRoutes } from 'hono/dev'
import { jsxRenderer } from 'hono/jsx-renderer'
import { validator } from 'hono/validator'

import { type FarcBase } from '../farc-base.js'
import { parsePath } from '../utils/parsePath.js'
import { Preview, Scripts, Styles } from './components.js'
import {
  fetchFrame,
  getInspectorData,
  getRoutes,
  htmlToFrame,
  htmlToState,
  validatePostBody,
} from './utils.js'

export function routes<
  state,
  env extends Env,
  schema extends Schema,
  basePath extends string,
>(app: FarcBase<state, env, schema, basePath>, path: string) {
  app.hono
    .use(`${parsePath(path)}/dev`, (c, next) =>
      jsxRenderer((props) => {
        const { children } = props
        const path = new URL(c.req.url).pathname.replace('/dev', '')
        return (
          <html lang="en">
            <head>
              <title>𝑭𝒂𝒓𝒄 {path || '/'}</title>
              <Styles />
              <Scripts />
            </head>
            <body>{children}</body>
          </html>
        )
      })(c, next),
    )
    .get(async (c) => {
      const baseUrl = c.req.url.replace('/dev', '')
      const response = await fetch(baseUrl)
      const text = await response.text()

      const frame = htmlToFrame(text)
      const state = htmlToState(text)
      const inspectorData = await getInspectorData(frame, state)
      const routes = getRoutes(baseUrl, inspectRoutes(app.hono))

      const props = { baseUrl, frame, inspectorData, routes, state }
      return c.render(<Preview {...props} />)
    })

  app.hono
    .post(
      `${parsePath(path)}/dev/action`,
      validator('json', validatePostBody),
      async (c) => {
        const baseUrl = c.req.url.replace('/dev/action', '')
        const json = c.req.valid('json')
        const { buttonIndex, castId, fid, inputText, postUrl } = json

        let response = await fetchFrame({
          baseUrl,
          buttonIndex,
          castId,
          fid,
          inputText,
          postUrl,
        })

        // fetch initial state on error
        const error = response.status !== 200 ? response.statusText : undefined
        if (response.status !== 200) response = await fetch(baseUrl)

        const text = await response.text()
        const frame = htmlToFrame(text)
        const state = htmlToState(text)
        const inspectorData = await getInspectorData(frame, state)
        const routes = getRoutes(baseUrl, inspectRoutes(app.hono))

        return c.json({ baseUrl, error, frame, inspectorData, state, routes })
      },
    )
    .post(
      `${parsePath(path)}/dev/redirect`,
      validator('json', validatePostBody),
      async (c) => {
        const baseUrl = c.req.url.replace('/dev/redirect', '')
        const json = c.req.valid('json')
        const { buttonIndex, castId, fid, inputText, postUrl } = json

        const response = await fetchFrame({
          baseUrl,
          buttonIndex,
          castId,
          fid,
          inputText,
          postUrl,
        })

        if (!response.redirected) return c.json({ success: false })
        return c.json({ success: true, redirectUrl: response.url })
      },
    )
}
