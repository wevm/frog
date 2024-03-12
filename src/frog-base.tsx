import { detect } from 'detect-browser'
import { Hono } from 'hono'
import { ImageResponse, type ImageResponseOptions } from 'hono-og'
import { type HonoOptions } from 'hono/hono-base'
import { html } from 'hono/html'
import { type Schema } from 'hono/types'
import lz from 'lz-string'
// TODO: maybe write our own "modern" universal path (or resolve) module.
// We are not using `node:path` to remain compatible with Edge runtimes.
import { default as p } from 'path-browserify'

import type { FrameContext, TransactionContext } from './types/context.js'
import type { Env } from './types/env.js'
import {
  type FrameImageAspectRatio,
  type FrameResponse,
} from './types/frame.js'
import type { Hub } from './types/hub.js'
import type { HandlerResponse } from './types/response.js'
import type { TransactionResponse } from './types/transaction.js'
import { type Pretty } from './types/utils.js'
import { fromQuery } from './utils/fromQuery.js'
import { getButtonValues } from './utils/getButtonValues.js'
import { getFrameContext } from './utils/getFrameContext.js'
import { getTransactionContext } from './utils/getTransactionContext.js'
import * as jws from './utils/jws.js'
import { parseBrowserLocation } from './utils/parseBrowserLocation.js'
import { parseImage } from './utils/parseImage.js'
import { parseIntents } from './utils/parseIntents.js'
import { parsePath } from './utils/parsePath.js'
import { requestBodyToContext } from './utils/requestBodyToContext.js'
import { serializeJson } from './utils/serializeJson.js'
import { toSearchParams } from './utils/toSearchParams.js'
import { version } from './version.js'

export type FrogConstructorParameters<
  env extends Env = Env,
  basePath extends string = '/',
  //
  _state = env['State'],
> = Pick<FrameResponse, 'browserLocation'> & {
  /**
   * The base path for assets.
   *
   * @example '/' (commonly for Vercel Serverless Functions)
   */
  assetsPath?: basePath | string | undefined
  /**
   * The base path for the server instance.
   *
   * @example '/api' (commonly for Vercel Serverless Functions)
   */
  basePath?: basePath | string | undefined
  /**
   * HTTP response headers.
   */
  headers?: Record<string, string> | undefined
  /**
   * Options to forward to the `Hono` instance.
   */
  honoOptions?: HonoOptions<env> | undefined
  /**
   * @deprecated Use `hub` instead.
   *
   * Farcaster Hub API URL.
   */
  hubApiUrl?: string | undefined
  /**
   * Farcaster Hub API configuration.
   */
  hub?: Hub | undefined
  /**
   * Default image options.
   *
   * @see https://vercel.com/docs/functions/og-image-generation/og-image-api
   * @see https://vercel.com/docs/functions/og-image-generation/og-image-examples#using-a-custom-font
   *
   * @example
   * { width: 1200, height: 630 }
   *
   * @example
   * async () => {
   *   const fontData = await fetch(
   *     new URL('./assets/inter.ttf', import.meta.url),
   *   ).then((res) => res.arrayBuffer());
   *
   *   return { fonts: [{ name: 'Inter', data: fontData, style: 'normal'}] }
   * }
   */
  imageOptions?:
    | ImageResponseOptions
    | (() => Promise<ImageResponseOptions>)
    | undefined
  /**
   * Default image aspect ratio.
   *
   * @default '1.91:1'
   */
  imageAspectRatio?: FrameImageAspectRatio | undefined
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
  initialState?: _state | undefined
  /**
   * Key used to sign secret data.
   *
   * It is used for:
   *   - Signing frame state, and
   *   - Signing auth session cookies in the devtools.
   *
   * It's strongly recommended to add a strong secret key before deploying to production.
   *
   * @example
   * '1zN3Uvl5QQd7OprLfp83IU96W6ip6KNPQ+l0MECPIZh8FBLYKQ+mPXE1CTxfwXGz'
   */
  secret?: string | undefined
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

export type RouteOptions = Pick<FrogConstructorParameters, 'verify'> & {
  fonts?:
    | ImageResponseOptions['fonts']
    | (() => Promise<ImageResponseOptions['fonts']>)
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
 * app.frame('/', (c) => {
 *   const { buttonValue, inputText, status } = c
 *   const fruit = inputText || buttonValue
 *   return c.res({
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
 *   })
 * })
 * ```
 */
export class FrogBase<
  env extends Env = Env,
  schema extends Schema = {},
  basePath extends string = '/',
  //
  _state = env['State'],
> {
  // Note: not using native `private` fields to avoid tslib being injected
  // into bundled code.
  _initialState: env['State'] = undefined as env['State']

  /** Path for assets. */
  assetsPath: string
  /** Base path of the server instance. */
  basePath: string
  /** URL to redirect to when the user is coming to the page via a browser. */
  browserLocation: string | undefined
  headers: FrogConstructorParameters['headers'] | undefined
  /** Hono instance. */
  hono: Hono<env, schema, basePath>
  /** Farcaster Hub API URL. */
  hubApiUrl: string | undefined
  /** Farcaster Hub API config. */
  hub: Hub | undefined
  /** Image aspect ratio. */
  imageAspectRatio: FrameImageAspectRatio = '1.91:1'
  /** Image options. */
  imageOptions:
    | ImageResponseOptions
    | (() => Promise<ImageResponseOptions>)
    | undefined
  fetch: Hono<env, schema, basePath>['fetch']
  get: Hono<env, schema, basePath>['get']
  post: Hono<env, schema, basePath>['post']
  use: Hono<env, schema, basePath>['use']
  /** Key used to sign secret data. */
  secret: FrogConstructorParameters['secret'] | undefined
  /** Whether or not frames should be verified. */
  verify: FrogConstructorParameters['verify'] = true

  constructor({
    assetsPath,
    basePath,
    browserLocation,
    headers,
    honoOptions,
    hubApiUrl,
    hub,
    imageAspectRatio,
    imageOptions,
    initialState,
    secret,
    verify,
  }: FrogConstructorParameters<env, basePath, _state> = {}) {
    this.hono = new Hono<env, schema, basePath>(honoOptions)
    if (basePath) this.hono = this.hono.basePath(basePath)
    if (browserLocation) this.browserLocation = browserLocation
    if (headers) this.headers = headers
    if (hubApiUrl) this.hubApiUrl = hubApiUrl
    if (hub) this.hub = hub
    if (imageAspectRatio) this.imageAspectRatio = imageAspectRatio
    if (imageOptions) this.imageOptions = imageOptions
    if (secret) this.secret = secret
    if (typeof verify !== 'undefined') this.verify = verify

    this.basePath = basePath ?? '/'
    this.assetsPath = assetsPath ?? this.basePath
    this.fetch = this.hono.fetch.bind(this.hono)
    this.get = this.hono.get.bind(this.hono)
    this.post = this.hono.post.bind(this.hono)
    this.use = this.hono.use.bind(this.hono)

    if (initialState) this._initialState = initialState
  }

  frame<path extends string>(
    path: path,
    handler: (
      context: Pretty<FrameContext<env, path>>,
    ) => HandlerResponse<FrameResponse>,
    options: RouteOptions = {},
  ) {
    const { verify = this.verify } = options

    // Frame Route (implements GET & POST).
    this.hono.use(parsePath(path), async (c) => {
      const url = new URL(c.req.url)
      const assetsUrl = url.origin + parsePath(this.assetsPath)
      const baseUrl = url.origin + parsePath(this.basePath)

      const { context, getState } = getFrameContext<env, path>({
        context: await requestBodyToContext(c, {
          hub:
            this.hub ||
            (this.hubApiUrl ? { apiUrl: this.hubApiUrl } : undefined),
          secret: this.secret,
          verify,
        }),
        initialState: this._initialState,
      })

      if (context.url !== parsePath(c.req.url)) return c.redirect(context.url)

      const response = await handler(context)
      if (response instanceof Response) return response

      const {
        action,
        browserLocation = this.browserLocation,
        headers = this.headers,
        imageAspectRatio = this.imageAspectRatio,
        image,
        imageOptions,
        intents,
        title = 'Frog Frame',
      } = response.data
      const buttonValues = getButtonValues(parseIntents(intents))

      if (context.status === 'redirect' && context.buttonIndex) {
        const buttonValue = buttonValues[context.buttonIndex - 1]
        const location = buttonValue?.replace(/^_r:/, '')
        if (!location) throw new Error('location required to redirect')
        return c.redirect(location, 302)
      }

      // If the user is coming from a browser, and a `browserLocation` is set,
      // then we will redirect the user to that location.
      const browser = detect(c.req.header('user-agent'))

      const browserLocation_ = parseBrowserLocation(c, browserLocation, {
        basePath: this.basePath,
        path,
      })
      if (browser?.name && browserLocation_)
        return c.redirect(
          browserLocation_.startsWith('http')
            ? browserLocation_
            : `${url.origin + p.resolve(this.basePath, browserLocation_)}`,
          302,
        )

      // Derive the previous state, and sign it if a secret is provided.
      const previousState = await (async () => {
        const state = await context.deriveState()
        if (!this.secret) return state
        if (!state) return state
        return jws.sign(JSON.stringify(state), this.secret)
      })()

      // We need to pass some context to the next frame to derive button values, state, etc.
      // Here, we are deriving two sets of "next frame state".
      // 1. For the INITIAL FRAME, we need to pass through the state as a search parameter
      //    due to Farcaster's constraints with the `fc:frame:state` tag. It must be empty
      //    for the initial frame.
      // 2. For SUBSEQUENT FRAMES, we can pass through the state as a serialized JSON object
      //    to the next frame via the `fc:frame:state` tag.
      const nextFrameStateSearch = toSearchParams({
        initialPath: context.initialPath,
        previousButtonValues: buttonValues,
      })
      const nextFrameStateMeta = serializeJson({
        initialPath: context.initialPath,
        previousButtonValues: buttonValues,
        previousState,
      })

      const imageUrl = await (async () => {
        if (typeof image !== 'string') {
          const encodedImage = lz.compressToEncodedURIComponent(
            JSON.stringify(await parseImage(image, { assetsUrl })),
          )
          const imageParams = toSearchParams({
            image: encodedImage,
            imageOptions: imageOptions
              ? {
                  ...imageOptions,
                  // TODO: Remove once `fonts` is removed from `imageOptions`.
                  fonts: undefined,
                }
              : undefined,
            headers,
          })
          return `${parsePath(context.url)}/image?${imageParams}`
        }
        if (image.startsWith('http') || image.startsWith('data')) return image
        return `${assetsUrl + parsePath(image)}`
      })()

      const postUrl = (() => {
        if (!action) return context.url
        if (action.startsWith('http')) return action
        return baseUrl + parsePath(action)
      })()

      const parsedIntents = parseIntents(intents, {
        baseUrl,
        search:
          context.status === 'initial'
            ? nextFrameStateSearch.toString()
            : undefined,
      })

      // Set response headers provided by consumer.
      for (const [key, value] of Object.entries(headers ?? {}))
        c.header(key, value)

      return c.render(
        <>
          {html`<!DOCTYPE html>`}
          <html lang="en">
            <head>
              <meta property="fc:frame" content="vNext" />
              <meta
                property="fc:frame:image:aspect_ratio"
                content={imageAspectRatio}
              />
              <meta property="fc:frame:image" content={imageUrl} />
              <meta property="og:image" content={imageUrl} />
              <meta property="og:title" content={title} />
              <meta
                property="fc:frame:post_url"
                content={
                  context.status === 'initial'
                    ? `${postUrl}?${nextFrameStateSearch.toString()}`
                    : postUrl
                }
              />
              {context.status !== 'initial' && (
                <meta property="fc:frame:state" content={nextFrameStateMeta} />
              )}
              {parsedIntents}

              <meta property="frog:version" content={version} />
              {/* The devtools needs a serialized context. */}
              {c.req.header('x-frog-dev') !== undefined && (
                <meta
                  property="frog:context"
                  content={serializeJson({
                    ...context,
                    // note: unserializable entities are undefined.
                    env: context.env
                      ? Object.assign(context.env, {
                          incoming: undefined,
                          outgoing: undefined,
                        })
                      : undefined,
                    req: undefined,
                    state: getState(),
                  })}
                />
              )}
            </head>
            <body />
          </html>
        </>,
      )
    })

    // OG Image Route
    this.hono.get(`${parsePath(path)}/image`, async (c) => {
      const defaultImageOptions = await (async () => {
        if (typeof this.imageOptions === 'function')
          return await this.imageOptions()
        return this.imageOptions
      })()

      const fonts = await (async () => {
        if (typeof options?.fonts === 'function') return await options.fonts()
        if (options?.fonts) return options.fonts
        return defaultImageOptions?.fonts
      })()

      const {
        headers = this.headers,
        image,
        imageOptions = defaultImageOptions,
      } = fromQuery<any>(c.req.query())
      const image_ = JSON.parse(lz.decompressFromEncodedURIComponent(image))
      return new ImageResponse(image_, {
        ...imageOptions,
        fonts,
        headers: imageOptions?.headers ?? headers,
      })
    })
  }

  route<
    subPath extends string,
    subSchema extends Schema,
    subBasePath extends string,
  >(path: subPath, frog: FrogBase<any, subSchema, subBasePath>) {
    if (frog.assetsPath === '/') frog.assetsPath = this.assetsPath
    if (frog.basePath === '/')
      frog.basePath = parsePath(this.basePath) + parsePath(path)
    if (!frog.browserLocation) frog.browserLocation = this.browserLocation
    if (!frog.headers) frog.headers = this.headers
    if (!frog.hubApiUrl) frog.hubApiUrl = this.hubApiUrl
    if (!frog.hub) frog.hub = this.hub
    if (!frog.imageOptions) frog.imageOptions = this.imageOptions
    if (!frog.secret) frog.secret = this.secret
    if (!frog.verify) frog.verify = this.verify

    return this.hono.route(path, frog.hono)
  }

  transaction<path extends string>(
    this: FrogBase<env, schema, basePath, _state>,
    path: path,
    handler: (
      context: TransactionContext<env, path, _state>,
    ) => HandlerResponse<TransactionResponse>,
    options: RouteOptions = {},
  ) {
    const { verify = this.verify } = options

    this.hono.post(parsePath(path), async (c) => {
      const { context } = getTransactionContext<env, path, _state>({
        context: await requestBodyToContext(c, {
          hub:
            this.hub ||
            (this.hubApiUrl ? { apiUrl: this.hubApiUrl } : undefined),
          secret: this.secret,
          verify,
        }),
        req: c.req,
      })
      const response = await handler(context)
      if (response instanceof Response) return response
      return c.json(response.data)
    })
  }
}
