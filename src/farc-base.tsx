import { detect } from 'detect-browser'
import { Hono } from 'hono'
import { ImageResponse } from 'hono-og'
import { type HonoOptions } from 'hono/hono-base'
import { type Env, type Schema } from 'hono/types'
// TODO: maybe write our own "modern" universal path (or resolve) module.
// We are not using `node:path` to remain compatible with Edge runtimes.
import { default as p } from 'path-browserify'

import {
  type FrameContext,
  type FrameImageAspectRatio,
  type FrameIntents,
} from './types.js'
import { fromQuery } from './utils/fromQuery.js'
import { getFrameContext } from './utils/getFrameContext.js'
import { getIntentData } from './utils/getIntentData.js'
import { parseIntents } from './utils/parseIntents.js'
import { parsePath } from './utils/parsePath.js'
import { requestToContext } from './utils/requestToContext.js'
import { serializeJson } from './utils/serializeJson.js'
import { toSearchParams } from './utils/toSearchParams.js'

export type FarcConstructorParameters<
  state = undefined,
  env extends Env = Env,
  basePath extends string = '/',
> = {
  /**
   * The base path for the server instance.
   *
   * @example '/api' (commonly for Vercel Serverless Functions)
   */
  basePath?: basePath | string | undefined
  /**
   * Location (URL or path relative to `basePath`) to redirect to when the user
   * is coming to the page via a browser.
   *
   * For instance, a user may reach the frame page in their
   * browser by clicking on the link beneath the frame on Warpcast.
   * We may want to redirect them to a different page (ie. a mint page, etc)
   * when they arrive via their browser.
   *
   * @example (Absolute Path)
   * Parameters:
   *   basePath: '/api'
   *   browserLocation: '/'
   *
   * https://example.com/api -> https://example.com/
   * https://example.com/api/foo -> https://example.com/
   *
   * @example (Absolute Path)
   * Parameters:
   *   basePath: '/api'
   *   browserLocation: '/mint'
   *
   * https://example.com/api -> https://example.com/mint
   * https://example.com/api/foo -> https://example.com/mint
   *
   * @example (Absolute Path with `:path` template)
   * Parameters
   *   basePath: '/api'
   *   browserLocation: '/:path'
   *
   * https://example.com/api -> https://example.com/
   * https://example.com/api/foo -> https://example.com/foo
   * https://example.com/api/foo/bar -> https://example.com/foo/bar
   *
   * @example (Relative Path)
   * Parameters:
   *   basePath: '/api'
   *   browserLocation: './dev'
   *
   * https://example.com/api -> https://example.com/api/dev
   * https://example.com/api/foo -> https://example.com/api/foo/dev
   *
   * @example (URL)
   * Parameters:
   *   browserLocation: 'https://google.com/:path'
   *
   * https://example.com/api -> https://google.com/api
   * https://example.com/api/foo -> https://google.com/api/foo
   */
  browserLocation?: string | undefined
  /**
   * Options to forward to the `Hono` instance.
   */
  honoOptions?: HonoOptions<env> | undefined
  /**
   * Farcaster Hub API URL.
   *
   * @default 'https://api.hub.wevm.dev'
   */
  hubApiUrl?: string | undefined
  /**
   * Initial state for the frames.
   *
   * @example
   * ```ts
   * initialState: {
   *   index: 0,
   *   todos: [],
   * }
   * ```
   */
  initialState?: state | undefined
  /**
   * Whether or not to verify frame data via the Farcaster Hub's `validateMessage` API.
   *
   * - When `true`, the frame will go through verification and throw an error if it fails.
   * - When `false`, the frame will not go through verification.
   * - When `undefined`, the frame will go through verification, but not throw an error if it fails.
   * Instead, the frame will receive `verified: false` in its context.
   *
   * @default true.
   */
  verify?: boolean | undefined
}

export type FrameOptions = Pick<FarcConstructorParameters, 'verify'>

export type FrameHandlerReturnType = Pick<
  FarcConstructorParameters,
  'browserLocation'
> & {
  /**
   * Path of the next frame.
   *
   * @example '/submit'
   */
  action?: string | undefined
  /**
   * The OG Image to render for the frame.
   *
   * @example
   * <div style={{ fontSize: 60 }}>Hello World</div>
   */
  image: JSX.Element
  /**
   * The aspect ratio of the OG Image.
   *
   * @example '1:1'
   */
  imageAspectRatio?: FrameImageAspectRatio | undefined
  /**
   * A set of intents (ie. buttons, text inputs, etc) to render for the frame
   * (beneath the OG image).
   *
   * @example
   * intents: [
   *   <TextInput placeholder="Enter your favourite food..." />,
   *   <Button>Submit</Button>,
   * ]
   */
  intents?: FrameIntents | undefined
}

/**
 * A Farc instance.
 *
 * @param parameters - {@link FarcConstructorParameters}
 * @returns instance. {@link FarcBase}
 *
 * @example
 * ```
 * import { Farc } from 'farc'
 *
 * const app = new Farc()
 *
 * app.frame('/', (context) => {
 *   const { buttonValue, inputText, status } = context
 *   const fruit = inputText || buttonValue
 *   return {
 *     image: (
 *       <div style={{ fontSize: 60 }}>
 *         {fruit ? `You selected: ${fruit}` : 'Welcome!'}
 *       </div>
 *     ),
 *     intents: [
 *       <Button value="apples">Apples</Button>,
 *       <Button value="oranges">Oranges</Button>,
 *       <Button value="bananas">Bananas</Button>,
 *     ]
 *   }
 * })
 * ```
 */
export class FarcBase<
  state = undefined,
  env extends Env = Env,
  schema extends Schema = {},
  basePath extends string = '/',
> {
  _initialState: state = undefined as state

  /** Base path of the server instance. */
  basePath: string
  /** URL to redirect to when the user is coming to the page via a browser. */
  browserLocation: string | undefined
  /** Hono instance. */
  hono: Hono<env, schema, basePath>
  /** Farcaster Hub API URL. */
  hubApiUrl = 'https://api.hub.wevm.dev'
  fetch: Hono<env, schema, basePath>['fetch']
  get: Hono<env, schema, basePath>['get']
  post: Hono<env, schema, basePath>['post']
  // TODO: default to `true` once devtools has auth.
  /** Whether or not frames should be verified. */
  verify: boolean = process.env.NODE_ENV !== 'development'

  constructor({
    basePath,
    browserLocation,
    honoOptions,
    hubApiUrl,
    initialState,
    verify,
  }: FarcConstructorParameters<state, env, basePath> = {}) {
    this.hono = new Hono<env, schema, basePath>(honoOptions)
    if (basePath) this.hono = this.hono.basePath(basePath)
    if (browserLocation) this.browserLocation = browserLocation
    if (hubApiUrl) this.hubApiUrl = hubApiUrl
    if (typeof verify !== 'undefined') this.verify = verify

    this.basePath = basePath ?? '/'
    this.fetch = this.hono.fetch.bind(this.hono)
    this.get = this.hono.get.bind(this.hono)
    this.post = this.hono.post.bind(this.hono)

    if (initialState) this._initialState = initialState
  }

  frame<path extends string>(
    path: path,
    handler: (
      context: FrameContext<path, state>,
    ) => FrameHandlerReturnType | Promise<FrameHandlerReturnType>,
    options: FrameOptions = {},
  ) {
    const { verify = this.verify } = options

    // Frame Route (implements GET & POST).
    this.hono.use(parsePath(path), async (c) => {
      const url = new URL(c.req.url)

      const context = await getFrameContext<state>({
        context: await requestToContext(c.req, {
          hubApiUrl: this.hubApiUrl,
          verify,
        }),
        initialState: this._initialState,
        request: c.req,
      })

      if (context.status === 'redirect') {
        const location = context.buttonValue
        if (!location) throw new Error('location required to redirect')
        return c.redirect(location, 302)
      }
      if (context.url !== parsePath(c.req.url)) return c.redirect(context.url)

      const {
        action,
        browserLocation = this.browserLocation,
        imageAspectRatio,
        intents,
      } = await handler(context)
      const parsedIntents = intents ? parseIntents(intents) : null
      const intentData = getIntentData(parsedIntents)

      // If the user is coming from a browser, and a `browserLocation` is set,
      // then we will redirect the user to that location.
      const browser = detect(c.req.header('user-agent'))
      const browserLocation_ = browserLocation
        ?.replace(':path', path.replace(/(^\/)|(\/$)/, ''))
        .replace(/^\/\//, '/')
      if (browser?.name && browserLocation_)
        return c.redirect(
          browserLocation_.startsWith('http')
            ? browserLocation_
            : `${url.origin + p.resolve(this.basePath, browserLocation_)}`,
          302,
        )

      // The OG route also needs context, so we will need to pass the current derived context,
      // via a query parameter to the OG image route (/image).
      const frameImageParams = toSearchParams({
        ...context,
        // We can't serialize `request` (aka `c.req`), so we'll just set it to undefined.
        request: undefined,
      })

      // We need to pass some context to the next frame to derive button values, state, etc.
      const nextFrameParams = toSearchParams({
        initialUrl: context.initialUrl,
        previousIntentData: intentData,
        previousState: context.deriveState(),
      })

      return c.render(
        <html lang="en">
          <head>
            <meta property="fc:frame" content="vNext" />
            <meta
              property="fc:frame:image"
              content={`${parsePath(
                context.url,
              )}/image?${frameImageParams.toString()}`}
            />
            <meta
              property="fc:frame:image:aspect_ratio"
              content={imageAspectRatio ?? '1.91:1'}
            />
            <meta
              property="og:image"
              content={`${parsePath(
                context.url,
              )}/image?${frameImageParams.toString()}`}
            />
            <meta
              property="fc:frame:post_url"
              content={`${
                action
                  ? url.origin +
                    parsePath(this.basePath) +
                    parsePath(action || '')
                  : context.url
              }?${nextFrameParams}`}
            />
            {parsedIntents}

            <meta property="farc:context" content={serializeJson(context)} />
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
      const context = await getFrameContext({
        context: fromQuery<FrameContext<path, state>>(query),
        initialState: this._initialState,
        request: c.req,
      })
      const { image } = await handler(context)
      return new ImageResponse(image)
    })
  }

  route<
    subPath extends string,
    subEnv extends Env,
    subSchema extends Schema,
    subBasePath extends string,
  >(path: subPath, farc: FarcBase<any, subEnv, subSchema, subBasePath>) {
    return this.hono.route(path, farc.hono)
  }
}
