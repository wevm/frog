import { type Env, type Schema } from 'hono'
import { inspectRoutes } from 'hono/dev'
import { jsxRenderer } from 'hono/jsx-renderer'

import { type FrogBase } from '../frog-base.js'
import { parsePath } from '../utils/parsePath.js'
import { toSearchParams } from '../utils/toSearchParams.js'
import { App } from './components/App.js'
import { getHtmlSize } from './utils/getHtmlSize.js'
import { getImageSize } from './utils/getImageSize.js'
import { getRoutes } from './utils/getRoutes.js'
import { htmlToFrame } from './utils/htmlToFrame.js'
import { htmlToContext } from './utils/htmlToState.js'
import { uid } from './utils/uid.js'
import { Context, valueKey, type Value } from './lib/context.js'

declare module 'hono' {
  interface ContextRenderer {
    (
      content: string | Promise<string>,
      props?: {
        title: string
        value: Value
      },
    ): Response
  }
}

export function routes<
  state,
  env extends Env,
  schema extends Schema,
  basePath extends string,
>(app: FrogBase<state, env, schema, basePath>, path: string) {
  app.get(
    `${parsePath(path)}/dev2`,
    jsxRenderer((props) => {
      const { children, value, title } = props
      return (
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <title>{title}</title>
            <link
              rel="stylesheet"
              href="/node_modules/frog/dev2/client/styles.css"
            />
          </head>
          <body>
            <div id="root">{children}</div>
            <script type="module" src="/node_modules/frog/dev2/client" />
            <script
              id={valueKey}
              type="application/json"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
              dangerouslySetInnerHTML={{ __html: JSON.stringify(value) }}
            />
          </body>
        </html>
      )
    }),
    async (c) => {
      const url = c.req.url.replace('/dev2', '')
      const value = await get(url)
      const title = `frame: ${new URL(url).pathname}`
      return c.render(
        <Context.Provider value={value}>
          <App />
        </Context.Provider>,
        { title, value },
      )
    },
  )

  // ngrok free redirects to `https` in the browser, but does not set
  // protocol to `https` on requests so need to correct
  const ngrokHostname = 'ngrok-free.app'
  // https://regexr.com/7sr6u
  const ngrokHttpRegex =
    /(http)((?:(?::\/\/)|(?:%253A%252F%252F)|(?:%3A%2F%2F))[a-z0-9\-]*\.ngrok-free\.app)/g

  async function get(url: string) {
    const timestamp = Date.now()

    performance.mark('start')
    const response = await fetch(url)
    performance.mark('end')

    const clonedResponse = response.clone()
    let text = await response.text()
    if (text.includes(ngrokHostname))
      text = text.replace(ngrokHttpRegex, 'https$2')

    const frame = htmlToFrame(text)
    const context = htmlToContext(text)

    // remove serialized context from image/imageUrl to save url space
    // tip: search for `_frog_` to see where it's added back
    const contextString = toSearchParams(context).toString()
    frame.image = frame.image.replace(contextString, '_frog_image')
    frame.imageUrl = frame.imageUrl.replace(contextString, '_frog_imageUrl')

    performance.measure('fetch', 'start', 'end')
    const measure = performance.getEntriesByName('fetch')[0]
    const speed = measure.duration
    performance.clearMarks()
    performance.clearMeasures()

    const cleanedUrl = new URL(url)
    cleanedUrl.search = ''
    let cleanedUrlString = cleanedUrl.toString().replace(/\/$/, '')
    if (cleanedUrlString.includes(ngrokHostname))
      cleanedUrlString = cleanedUrlString.replace(ngrokHttpRegex, 'https$2')

    const [htmlSize, imageSize] = await Promise.all([
      getHtmlSize(clonedResponse),
      getImageSize(text),
    ])
    const routes = getRoutes(url, inspectRoutes(app.hono))

    return {
      data: {
        id: uid(),
        type: 'initial',
        method: 'get',
        context,
        frame,
        metrics: {
          htmlSize,
          imageSize,
          speed,
        },
        response: {
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
        },
        timestamp,
        url: cleanedUrlString,
      },
      routes,
    } satisfies Value
  }
}
