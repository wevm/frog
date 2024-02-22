import { detect } from 'detect-browser'
import { Hono } from 'hono'
import { ImageResponse, type ImageResponseOptions } from 'hono-og'
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
import { parseBrowserLocation } from './utils/parseBrowserLocation.js'
import { parseIntents } from './utils/parseIntents.js'
import { parsePath } from './utils/parsePath.js'
import { requestToContext } from './utils/requestToContext.js'
import { serializeJson } from './utils/serializeJson.js'
import { toSearchParams } from './utils/toSearchParams.js'

export type FrogConstructorParameters<
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
   * Options for built-in devtools.
   */
  devtools?:
    | {
        /** Custom app fid to auth with. */
        appFid?: string | undefined
        /** Custom app mnemonic to auth with. */
        appMnemonic?: string | undefined
        /**
         * Key used to sign secret data.
         *
         * It's strongly recommended to add a strong secret key before deploying to production.
         *
         * @example
         * '1zN3Uvl5QQd7OprLfp83IU96W6ip6KNPQ+l0MECPIZh8FBLYKQ+mPXE1CTxfwXGz'
         */
        secret?: string | undefined
      }
    | undefined
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
   * Default image options.
   *
   * @see https://vercel.com/docs/functions/og-image-generation/og-image-api
   *
   * @example
   * { width: 1200, height: 630 }
   */
  imageOptions?: ImageResponseOptions | undefined
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
   * - When `"silent"`, the frame will go through verification, but not throw an error if it fails.
   * Instead, the frame will receive `verified: false` in its context.
   * - When `false`, the frame will not go through verification.
   *
   * @default true.
   */
  verify?: boolean | 'silent' | undefined
}

export type FrameOptions = Pick<FrogConstructorParameters, 'verify'>

export type FrameHandlerReturnType = Pick<
  FrogConstructorParameters,
  'browserLocation'
> & {
  /**
   * Path of the next frame.
   *
   * @example '/submit'
   */
  action?: string | undefined
  /**
   * The OG Image to render for the frame. Can either be a JSX element, or URL.
   *
   * @example
   * <div style={{ fontSize: 60 }}>Hello World</div>
   *
   * @example
   * "https://i.ytimg.com/vi/R3UACX5eULI/maxresdefault.jpg"
   */
  image: string | JSX.Element
  /**
   * The aspect ratio of the OG Image.
   *
   * @example '1:1'
   */
  imageAspectRatio?: FrameImageAspectRatio | undefined
  /**
   * Image options.
   *
   * @see https://vercel.com/docs/functions/og-image-generation/og-image-api
   *
   * @example
   * { width: 1200, height: 630 }
   */
  imageOptions?: ImageResponseOptions | undefined
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
 * A Frog instance.
 *
 * @param parameters - {@link FrogConstructorParameters}
 * @returns instance. {@link FrogBase}
 *
 * @example
 * ```
 * import { Frog } from 'frog'
 *
 * const app = new Frog()
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
export class FrogBase<
  state = undefined,
  env extends Env = Env,
  schema extends Schema = {},
  basePath extends string = '/',
> {
  // Note: not using native `private` fields to avoid tslib being injected
  // into bundled code.
  _imageOptions: ImageResponseOptions | undefined
  _initialState: state = undefined as state

  /** Base path of the server instance. */
  basePath: string
  /** URL to redirect to when the user is coming to the page via a browser. */
  browserLocation: string | undefined
  devtools: FrogConstructorParameters['devtools'] | undefined
  /** Hono instance. */
  hono: Hono<env, schema, basePath>
  /** Farcaster Hub API URL. */
  hubApiUrl: string | undefined
  fetch: Hono<env, schema, basePath>['fetch']
  get: Hono<env, schema, basePath>['get']
  post: Hono<env, schema, basePath>['post']
  use: Hono<env, schema, basePath>['use']
  /** Whether or not frames should be verified. */
  verify: FrogConstructorParameters['verify'] = true

  constructor({
    basePath,
    browserLocation,
    devtools,
    honoOptions,
    hubApiUrl,
    imageOptions,
    initialState,
    verify,
  }: FrogConstructorParameters<state, env, basePath> = {}) {
    this.hono = new Hono<env, schema, basePath>(honoOptions)
    if (basePath) this.hono = this.hono.basePath(basePath)
    if (browserLocation) this.browserLocation = browserLocation
    if (devtools) this.devtools = devtools
    if (hubApiUrl) this.hubApiUrl = hubApiUrl
    if (imageOptions) this._imageOptions = imageOptions
    if (typeof verify !== 'undefined') this.verify = verify

    this.basePath = basePath ?? '/'
    this.fetch = this.hono.fetch.bind(this.hono)
    this.get = this.hono.get.bind(this.hono)
    this.post = this.hono.post.bind(this.hono)
    this.use = this.hono.use.bind(this.hono)

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
        image,
        intents,
      } = await handler(context)
      const parsedIntents = intents ? parseIntents(intents) : null
      const intentData = getIntentData(parsedIntents)

      // If the user is coming from a browser, and a `browserLocation` is set,
      // then we will redirect the user to that location.
      const browser = detect(c.req.header('user-agent'))

      const browserLocation_ = parseBrowserLocation(c, browserLocation, path)
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
      const nextFrameState = serializeJson({
        initialUrl: context.initialUrl,
        previousIntentData: intentData,
        previousState: context.deriveState(),
      })

      return c.render(
        <html lang="en">
          <head>
            <meta property="fc:frame" content="vNext" />
            <meta
              property="fc:frame:image:aspect_ratio"
              content={imageAspectRatio ?? '1.91:1'}
            />
            <meta
              property="fc:frame:image"
              content={
                typeof image === 'string'
                  ? image
                  : `${parsePath(
                      context.url,
                    )}/image?${frameImageParams.toString()}`
              }
            />
            <meta
              property="og:image"
              content={
                typeof image === 'string'
                  ? image
                  : `${parsePath(
                      context.url,
                    )}/image?${frameImageParams.toString()}`
              }
            />
            <meta
              property="fc:frame:post_url"
              content={
                action
                  ? url.origin +
                    parsePath(this.basePath) +
                    parsePath(action || '')
                  : context.url
              }
            />
            <meta property="fc:frame:state" content={nextFrameState} />
            {parsedIntents}

            <meta property="frog:context" content={serializeJson(context)} />
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
      const { image, imageOptions = this._imageOptions } =
        await handler(context)
      if (typeof image === 'string') return c.redirect(image, 302)
      return new ImageResponse(image, imageOptions)
    })
  }

  route<
    subPath extends string,
    subEnv extends Env,
    subSchema extends Schema,
    subBasePath extends string,
  >(path: subPath, frog: FrogBase<any, subEnv, subSchema, subBasePath>) {
    return this.hono.route(path, frog.hono)
  }
}
