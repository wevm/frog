import { type Env, type Schema } from 'hono'
import { getCookie, getSignedCookie } from 'hono/cookie'
import { inspectRoutes } from 'hono/dev'
import { jsxRenderer } from 'hono/jsx-renderer'
import { validator } from 'hono/validator'

import { type FrogBase } from '../frog-base.js'
import { verify } from '../utils/jws.js'
import { parsePath } from '../utils/parsePath.js'
import { toSearchParams } from '../utils/toSearchParams.js'
import { App } from './components/App.js'
import { type ActionData, type BaseData, type RedirectData } from './types.js'
import { fetchFrame } from './utils/fetchFrame.js'
import { getHtmlSize } from './utils/getHtmlSize.js'
import { getImageSize } from './utils/getImageSize.js'
import { getRoutes } from './utils/getRoutes.js'
import { htmlToFrame } from './utils/htmlToFrame.js'
import { htmlToContext } from './utils/htmlToState.js'
import { uid } from './utils/uid.js'
import { validateFramePostBody } from './utils/validateFramePostBody.js'
import { dataId, Provider, type Props } from './lib/context.js'

declare module 'hono' {
  interface ContextRenderer {
    (
      content: string | Promise<string>,
      props?: {
        title: string
        value: Props
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
            {/* TODO: Load from file system */}
            <link rel="preconnect" href="https://rsms.me/" />
            <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
            <link rel="icon" href="https://frog.fm/icon.png" type="image/png" />
          </head>
          <body>
            <div id="root">{children}</div>
            <script type="module" src="/node_modules/frog/dev2/client" />
            <script
              id={dataId}
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
      return c.render(
        <Provider {...value}>
          <App />
        </Provider>,
        { title: `frame: ${new URL(url).pathname}`, value },
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
    } satisfies Props
  }

  /////////////////////////////////////////////////////////////////////////////////////////
  // Post Frame Actions
  /////////////////////////////////////////////////////////////////////////////////////////

  app
    .use('*', async (c, next) => {
      const user = getCookie(c, 'user')
      const fid = user ? JSON.parse(user).userFid : undefined
      // @ts-ignore
      c.set('fid', fid)

      const session = app.secret
        ? await getSignedCookie(c, app.secret, 'session')
        : getCookie(c, 'session')
      const keypair = session ? JSON.parse(session) : undefined
      // @ts-ignore
      c.set('keypair', keypair)

      await next()
    })
    .post(
      `${parsePath(path)}/dev2/frame/action`,
      validator('json', validateFramePostBody),
      async (c) => {
        // TODO: Hono should be able to infer these types
        const vars = c.var as unknown as {
          fid: number
          keypair: { privateKey: string } | undefined
        }

        const json = c.req.valid('json')
        const fid = (json.fid ?? vars.fid) as number
        const body = { ...json, fid }
        const privateKey = vars.keypair?.privateKey
        const response = await fetchFrame({ body, privateKey })

        performance.measure('fetch', 'start', 'end')
        const measure = performance.getEntriesByName('fetch')[0]
        const speed = measure.duration
        performance.clearMarks()
        performance.clearMeasures()

        const clonedResponse = response.clone()
        let text = await response.text()
        if (text.includes(ngrokHostname))
          text = text.replace(ngrokHttpRegex, 'https$2')

        const frame = htmlToFrame(text)
        const context = htmlToContext(text)

        // decode frame state for debugging
        try {
          const state = JSON.parse(
            decodeURIComponent(frame.state),
          ).previousState
          if (state)
            if (app.secret)
              frame.debug.state = JSON.parse(await verify(state, app.secret))
            else frame.debug.state = state
        } catch (error) {}

        // remove serialized context from image/imageUrl to save url space
        // tip: search for `_frog_` to see where it's added back
        const contextString = toSearchParams(context).toString()
        frame.image = frame.image.replace(contextString, '_frog_image')
        frame.imageUrl = frame.imageUrl.replace(contextString, '_frog_imageUrl')

        const [htmlSize, imageSize] = await Promise.all([
          getHtmlSize(clonedResponse),
          getImageSize(text),
        ])

        const baseUrl = c.req.url.replace('/dev2/frame/action', '')
        const routes = getRoutes(baseUrl, inspectRoutes(app.hono))

        return c.json({
          data: {
            id: uid(),
            type: 'action',
            method: 'post',
            body,
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
            timestamp: Date.now(),
          },
          routes,
        } satisfies {
          data: BaseData & ActionData
          routes: string[]
        })
      },
    )
    .post(
      `${parsePath(path)}/dev2/frame/redirect`,
      validator('json', validateFramePostBody),
      async (c) => {
        // TODO: Hono should be able to infer these types
        const vars = c.var as unknown as {
          fid: number
          keypair: { privateKey: string } | undefined
        }

        const json = c.req.valid('json')
        const fid = (json.fid ?? vars.fid) as number
        const body = { ...json, fid }

        let response: Response
        let error: string | undefined
        try {
          const privateKey = vars.keypair?.privateKey
          response = await fetchFrame({ body, privateKey })
        } catch (err) {
          response = {
            ok: false,
            redirected: false,
            status: 500,
            statusText: 'Internal Server Error',
          } as Response
          error = `${(err as Error).cause}`.replace('Error: ', '')
        }

        performance.measure('fetch', 'start', 'end')
        const measure = performance.getEntriesByName('fetch')[0]
        const speed = measure.duration
        performance.clearMarks()
        performance.clearMeasures()

        return c.json({
          id: uid(),
          type: 'redirect',
          method: 'post',
          body,
          metrics: { speed },
          response: response.redirected
            ? {
                success: true,
                location: response.url,
                status: 302,
                statusText: 'Found',
              }
            : {
                success: false,
                error,
                status: response.status,
                statusText: response.statusText,
              },
          timestamp: Date.now(),
        } satisfies BaseData & RedirectData)
      },
    )
}
