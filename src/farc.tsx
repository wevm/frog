import { Message } from '@farcaster/core'
import { bytesToHex } from '@noble/curves/abstract/utils'
import { Hono } from 'hono'
import { ImageResponse } from 'hono-og'
import { inspectRoutes } from 'hono/dev'
import { type HonoOptions } from 'hono/hono-base'
import { jsxRenderer } from 'hono/jsx-renderer'
import { type Env, type Schema } from 'hono/types'
import { validator } from 'hono/validator'

import { Dev, Preview, Style } from './dev/components.js'
import {
  fetchFrameMessage,
  getData,
  getRoutes,
  htmlToFrame,
  htmlToState,
} from './dev/utils.js'
import {
  type FrameContext,
  type FrameImageAspectRatio,
  type FrameIntents,
  type PreviousFrameContext,
} from './types.js'
import { deserializeJson } from './utils/deserializeJson.js'
import { getFrameContext } from './utils/getFrameContext.js'
import { parseIntents } from './utils/parseIntents.js'
import { parsePath } from './utils/parsePath.js'
import { requestToContext } from './utils/requestToContext.js'
import { serializeJson } from './utils/serializeJson.js'

export type FarcConstructorParameters<
  state = undefined,
  env extends Env = Env,
  basePath extends string = '/',
> = {
  basePath?: basePath | string | undefined
  honoOptions?: HonoOptions<env> | undefined
  initialState?: state | undefined
}

export type FrameHandlerReturnType = {
  action?: string | undefined
  image: JSX.Element
  imageAspectRatio?: FrameImageAspectRatio | undefined
  intents?: FrameIntents | undefined
}

export class Farc<
  state = undefined,
  env extends Env = Env,
  schema extends Schema = {},
  basePath extends string = '/',
> {
  #initialState: state = undefined as state

  hono: Hono<env, schema, basePath>
  fetch: Hono<env, schema, basePath>['fetch']
  get: Hono<env, schema, basePath>['get']
  post: Hono<env, schema, basePath>['post']

  constructor({
    basePath,
    honoOptions,
    initialState,
  }: FarcConstructorParameters<state, env, basePath> = {}) {
    this.hono = new Hono<env, schema, basePath>(honoOptions)
    if (basePath) this.hono = this.hono.basePath(basePath)
    this.fetch = this.hono.fetch.bind(this.hono)
    this.get = this.hono.get.bind(this.hono)
    this.post = this.hono.post.bind(this.hono)

    if (initialState) this.#initialState = initialState
  }

  frame<path extends string>(
    path: path,
    handler: (
      context: FrameContext<path, state>,
      previousContext: PreviousFrameContext<path, state> | undefined,
    ) => FrameHandlerReturnType | Promise<FrameHandlerReturnType>,
  ) {
    // Frame Route (implements GET & POST).
    this.hono.use(parsePath(path), async (c) => {
      const query = c.req.query()

      const url = new URL(c.req.url)
      const baseUrl = `${url.origin}${url.pathname}`

      const previousContext = query.previousContext
        ? deserializeJson<PreviousFrameContext<path, state>>(
            query.previousContext,
          )
        : undefined
      const context = await getFrameContext({
        context: await requestToContext(c.req),
        initialState: this.#initialState,
        previousContext,
        request: c.req,
      })

      if (context.url !== parsePath(c.req.url))
        return c.redirect(
          `${context.url}?previousContext=${query.previousContext}`,
        )

      const { action, imageAspectRatio, intents } = await handler(
        context,
        previousContext,
      )
      const parsedIntents = intents ? parseIntents(intents) : null

      const serializedContext = serializeJson(context)
      const serializedPreviousContext = serializeJson({
        ...context,
        intents: parsedIntents,
        previousState: context.deriveState(),
      })

      const ogSearch = new URLSearchParams()
      if (query.previousContext)
        ogSearch.set('previousContext', query.previousContext)
      if (serializedContext) ogSearch.set('context', serializedContext)

      const postSearch = new URLSearchParams()
      if (serializedPreviousContext)
        postSearch.set('previousContext', serializedPreviousContext)

      return c.render(
        <html lang="en">
          <head>
            <meta property="fc:frame" content="vNext" />
            <meta
              property="fc:frame:image"
              content={`${parsePath(context.url)}/image?${ogSearch.toString()}`}
            />
            <meta
              property="fc:frame:image:aspect_ratio"
              content={imageAspectRatio ?? '1.91:1'}
            />
            <meta
              property="og:image"
              content={`${parsePath(context.url)}/image?${ogSearch.toString()}`}
            />
            <meta
              property="fc:frame:post_url"
              content={`${
                action ? baseUrl + parsePath(action || '') : context.url
              }?${postSearch}`}
            />
            {parsedIntents}

            <meta property="farc:context" content={serializedContext} />
            {query.previousContext && (
              <meta
                property="farc:prev_context"
                content={query.previousContext}
              />
            )}
          </head>
          <body
            style={{
              alignItems: 'center',
              display: 'flex',
              justifyContent: 'center',
              minHeight: '100vh',
              overflow: 'hidden',
            }}
          >
            <a style={{ textDecoration: 'none' }} href={`${context.url}/dev`}>
              view 𝒇𝒓𝒂𝒎𝒆
            </a>
          </body>
        </html>,
      )
    })

    // OG Image Route
    this.hono.get(`${parsePath(path)}/image`, async (c) => {
      const query = c.req.query()
      const previousContext = query.previousContext
        ? deserializeJson<PreviousFrameContext<path, state>>(
            query.previousContext,
          )
        : undefined
      const context = await getFrameContext({
        context: deserializeJson<FrameContext<path, state>>(query.context),
        initialState: this.#initialState,
        previousContext,
        request: c.req,
      })
      const { image } = await handler(context, previousContext)
      return new ImageResponse(image)
    })

    // Frame Dev Routes
    this.hono
      .use(`${parsePath(path)}/dev`, (c, next) =>
        jsxRenderer((props) => {
          const { children } = props
          const path = new URL(c.req.url).pathname.replace('/dev', '')
          return (
            <html lang="en">
              <head>
                <title>𝑭𝒂𝒓𝒄 {path || '/'}</title>
                <Style />
                {/* TODO: Vendor into project */}
                <script
                  defer
                  src="https://cdn.jsdelivr.net/npm/@alpinejs/focus@3.x.x/dist/cdn.min.js"
                />
                <script
                  defer
                  src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"
                />
                <script
                  src="https://unpkg.com/htmx.org@1.9.10"
                  integrity="sha384-D1Kt99CQMDuVetoL1lrYwg5t+9QdHe7NLX/SoJYkXDFfX37iInKRy5xLSi8nO7UC"
                  crossorigin="anonymous"
                />
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
        const routes = getRoutes(baseUrl, inspectRoutes(this.hono))

        return c.render(<Dev {...{ baseUrl, frame, routes, state }} />)
      })
      .post(
        validator('form', (value, c) => {
          try {
            return getData(value)
          } catch (e) {
            return c.text('Invalid data', 400)
          }
        }),
        async (c) => {
          const baseUrl = c.req.url.replace('/dev', '')
          const form = c.req.valid('form')
          const { buttonIndex, castId, fid, inputText, postUrl } = form

          const message = await fetchFrameMessage({
            baseUrl,
            buttonIndex,
            castId,
            fid,
            inputText,
          })

          let response = await fetch(postUrl, {
            method: 'POST',
            body: JSON.stringify({
              untrustedData: {
                buttonIndex,
                castId: {
                  fid: castId.fid,
                  hash: `0x${bytesToHex(castId.hash)}`,
                },
                fid,
                inputText: inputText
                  ? Buffer.from(inputText).toString('utf-8')
                  : undefined,
                messageHash: `0x${bytesToHex(message.hash)}`,
                network: 1,
                timestamp: message.data.timestamp,
                url: baseUrl,
              },
              trustedData: {
                messageBytes: Buffer.from(
                  Message.encode(message).finish(),
                ).toString('hex'),
              },
            }),
          })

          // fetch initial state on error
          const error =
            response.status !== 200 ? response.statusText : undefined
          if (response.status !== 200) response = await fetch(baseUrl)

          const text = await response.text()
          // TODO: handle redirects
          const frame = htmlToFrame(text)
          const state = htmlToState(text)
          const routes = getRoutes(baseUrl, inspectRoutes(this.hono))

          return c.render(
            <Preview {...{ baseUrl, error, frame, routes, state }} />,
          )
        },
      )

    this.hono.post(
      `${parsePath(path)}/dev/redirect`,
      validator('json', (value, c) => {
        try {
          return getData(value)
        } catch (e) {
          return c.text('Invalid data', 400)
        }
      }),
      async (c) => {
        const baseUrl = c.req.url.replace('/dev', '')
        const json = c.req.valid('json')
        const { buttonIndex, castId, fid, inputText, postUrl } = json

        const message = await fetchFrameMessage({
          baseUrl,
          buttonIndex,
          castId,
          fid,
          inputText,
        })

        console.log(postUrl)
        const response = await fetch(postUrl, {
          method: 'POST',
          body: JSON.stringify({
            untrustedData: {
              buttonIndex,
              castId: {
                fid: castId.fid,
                hash: `0x${bytesToHex(castId.hash)}`,
              },
              fid,
              inputText: inputText
                ? Buffer.from(inputText).toString('utf-8')
                : undefined,
              messageHash: `0x${bytesToHex(message.hash)}`,
              network: 1,
              timestamp: message.data.timestamp,
              url: baseUrl,
            },
            trustedData: {
              messageBytes: Buffer.from(
                Message.encode(message).finish(),
              ).toString('hex'),
            },
          }),
        })

        // TODO: Get redirect url
        console.log({ response })

        return c.json({
          success: true,
          redirectUrl: '/',
        })
      },
    )
  }

  route<
    subPath extends string,
    subEnv extends Env,
    subSchema extends Schema,
    subBasePath extends string,
  >(path: subPath, farc: Farc<any, subEnv, subSchema, subBasePath>) {
    return this.hono.route(path, farc.hono)
  }
}
