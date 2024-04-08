import { detect } from 'detect-browser'
import { Hono } from 'hono'
import { ImageResponse } from 'hono-og'
import type { HonoOptions } from 'hono/hono-base'
import { html } from 'hono/html'
import type { Schema } from 'hono/types'
import lz from 'lz-string'
// TODO: maybe write our own "modern" universal path (or resolve) module.
// We are not using `node:path` to remain compatible with Edge runtimes.
import { default as p } from 'path-browserify'

import type { Env } from './types/env.js'
import type {
  FrameImageAspectRatio,
  FrameResponse,
  ImageOptions,
} from './types/frame.js'
import type { Hub } from './types/hub.js'
import type {
  ActionHandler,
  FrameHandler,
  HandlerInterface,
  MiddlewareHandlerInterface,
  TransactionHandler,
} from './types/routes.js'
import type { Vars } from './ui/vars.js'
import { fromQuery } from './utils/fromQuery.js'
import { getActionContext } from './utils/getActionContext.js'
import { getButtonValues } from './utils/getButtonValues.js'
import { getFrameContext } from './utils/getFrameContext.js'
import { getImagePaths } from './utils/getImagePaths.js'
import { getRequestUrl } from './utils/getRequestUrl.js'
import { getRouteParameters } from './utils/getRouteParameters.js'
import { getTransactionContext } from './utils/getTransactionContext.js'
import * as jws from './utils/jws.js'
import { parseBrowserLocation } from './utils/parseBrowserLocation.js'
import { parseFonts } from './utils/parseFonts.js'
import { parseHonoPath } from './utils/parseHonoPath.js'
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
   * @deprecated Use `devtools` from `'frog/dev'` instead.
   *
   * Options for built-in devtools.
   */
  dev?:
    | {
        /** @deprecated */
        enabled?: boolean | undefined
        /** @deprecated */
        appFid?: number | undefined
        /** @deprecated */
        appMnemonic?: string | undefined
      }
    | undefined
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
  imageOptions?: ImageOptions | (() => Promise<ImageOptions>) | undefined
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
   * Origin URL of the server instance.
   *
   * @link https://developer.mozilla.org/en-US/docs/Web/API/URL/origin
   */
  origin?: string | undefined
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
   * FrogUI configuration.
   */
  ui?: { vars: Vars | undefined } | undefined
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
  fonts?: ImageOptions['fonts'] | (() => Promise<ImageOptions['fonts']>)
}

/**
 * A Frog instance.
 *
 * @param parameters - {@link FrogConstructorParameters}
 * @returns instance. {@link Frog}
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
  dev: FrogConstructorParameters['dev'] | undefined
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
  imageOptions: ImageOptions | (() => Promise<ImageOptions>) | undefined
  /** Origin URL of the server instance. */
  origin: string | undefined
  fetch: Hono<env, schema, basePath>['fetch']
  get: Hono<env, schema, basePath>['get']
  post: Hono<env, schema, basePath>['post']
  /** Key used to sign secret data. */
  secret: FrogConstructorParameters['secret'] | undefined
  /** FrogUI configuration. */
  ui: { vars: Vars | undefined } | undefined
  /** Whether or not frames should be verified. */
  verify: FrogConstructorParameters['verify'] = true

  _dev: string | undefined
  version = version

  constructor({
    assetsPath,
    basePath,
    browserLocation,
    dev,
    headers,
    honoOptions,
    hubApiUrl,
    hub,
    imageAspectRatio,
    imageOptions,
    initialState,
    origin,
    secret,
    ui,
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
    if (origin) this.origin = origin
    if (secret) this.secret = secret
    if (ui) this.ui = ui
    if (typeof verify !== 'undefined') this.verify = verify

    this.basePath = basePath ?? '/'
    this.assetsPath = assetsPath ?? this.basePath
    this.fetch = this.hono.fetch.bind(this.hono)
    this.get = this.hono.get.bind(this.hono)
    this.post = this.hono.post.bind(this.hono)

    if (initialState) this._initialState = initialState

    if (dev) this.dev = { enabled: true, ...(dev ?? {}) }
    this._dev = undefined // this is set `true` by `devtools` helper

    // allow devtools to work with dynamic params off base path
    this.hono.all('*', async (c, next) => {
      if (this._dev)
        for (const { handler, path } of c.req.matchedRoutes)
          if (path === this._dev) return handler(c, next)
      await next()
    })
  }

  action: HandlerInterface<env, 'action', schema, basePath> = (
    ...parameters: any[]
  ) => {
    const [path, middlewares, handler, options = {}] = getRouteParameters<
      env,
      ActionHandler<env>
    >(...parameters)

    const { verify = this.verify } = options

    // Action Route (implements POST).
    this.hono.post(parseHonoPath(path), ...middlewares, async (c) => {
      const url = getRequestUrl(c.req)
      const origin = this.origin ?? url.origin

      const { context } = getActionContext<env, string>({
        context: await requestBodyToContext(c, {
          hub:
            this.hub ||
            (this.hubApiUrl ? { apiUrl: this.hubApiUrl } : undefined),
          secret: this.secret,
          verify,
          origin,
        }),
      })

      const response = await handler(context)
      if (response instanceof Response) return response

      const { headers = this.headers, message } = response.data

      // Set response headers provided by consumer.
      for (const [key, value] of Object.entries(headers ?? {}))
        c.header(key, value)

      c.status(response.data.statusCode ?? 200)
      return c.json({ message })
    })

    return this
  }

  frame: HandlerInterface<env, 'frame', schema, basePath> = (
    ...parameters: any[]
  ) => {
    const [path, middlewares, handler, options = {}] = getRouteParameters<
      env,
      FrameHandler<env>
    >(...parameters)

    const { verify = this.verify } = options

    // OG Image Route
    const imagePaths = getImagePaths(parseHonoPath(path))
    for (const imagePath of imagePaths) {
      this.hono.get(imagePath, async (c) => {
        const defaultImageOptions = await (async () => {
          if (typeof this.imageOptions === 'function')
            return await this.imageOptions()
          return this.imageOptions
        })()

        const fonts = await (async () => {
          if (this.ui?.vars?.fonts)
            return Object.values(this.ui?.vars.fonts).flat()
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
          width: 1200,
          height: 630,
          ...imageOptions,
          format: imageOptions?.format ?? 'png',
          fonts: await parseFonts(fonts),
          headers: imageOptions?.headers ?? headers,
        })
      })
    }

    // Frame Route (implements GET & POST).

    this.hono.use(parseHonoPath(path), ...middlewares, async (c) => {
      const url = getRequestUrl(c.req)
      const origin = this.origin ?? url.origin
      const assetsUrl = origin + parsePath(this.assetsPath)
      const baseUrl = origin + parsePath(this.basePath)

      const { context, getState } = getFrameContext<env, string>({
        context: await requestBodyToContext(c, {
          hub:
            this.hub ||
            (this.hubApiUrl ? { apiUrl: this.hubApiUrl } : undefined),
          secret: this.secret,
          verify,
          origin,
        }),
        initialState: this._initialState,
      })

      if (context.url !== parsePath(url.href)) return c.redirect(context.url)

      const response = await handler(context)
      if (response instanceof Response) return response

      const {
        action,
        browserLocation = this.browserLocation,
        headers = this.headers,
        imageAspectRatio = this.imageAspectRatio,
        image,
        imageOptions: imageOptions_ = this.imageOptions,
        intents,
        ogImage,
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
            : `${origin + p.resolve(this.basePath, browserLocation_)}`,
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

      const imageOptions = await (async () => {
        if (typeof imageOptions_ === 'function') return await imageOptions_()
        return imageOptions_
      })()

      const imageUrl = await (async () => {
        if (typeof image !== 'string') {
          const compressedImage = lz.compressToEncodedURIComponent(
            JSON.stringify(
              await parseImage(
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    width: '100%',
                  }}
                >
                  {await image}
                </div>,
                {
                  assetsUrl,
                  ui: {
                    ...this.ui,
                    vars: {
                      ...this.ui?.vars,
                      frame: {
                        height: imageOptions?.height!,
                        width: imageOptions?.width!,
                      },
                    },
                  },
                },
              ),
            ),
          )
          const imageParams = toSearchParams({
            image: compressedImage,
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

      const ogImageUrl = (() => {
        if (!ogImage) return undefined
        if (ogImage.startsWith('http')) return ogImage
        return baseUrl + parsePath(ogImage)
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

      const renderAsHTML =
        c.req.header('Accept') === 'text/html' ||
        c.req.query('accept') === 'text/html'
      if (renderAsHTML) {
        const height = imageOptions?.height ?? 630
        const width = imageOptions?.width ?? 1200

        // Convert `tw` to `class`
        const __html = image.toString().replace(/tw=/g, 'class=')

        const fonts = await (async () => {
          if (this.ui?.vars?.fonts)
            return Object.values(this.ui.vars.fonts).flat()
          if (typeof options?.fonts === 'function') return await options.fonts()
          if (options?.fonts) return options.fonts
          return imageOptions?.fonts
        })()
        const groupedFonts = new Map<string, NonNullable<typeof fonts>>()
        if (fonts)
          for (const font of fonts) {
            const key = `${font.source ? `${font.source}:` : ''}${font.name}`
            if (groupedFonts.has(key)) groupedFonts.get(key)?.push(font)
            else groupedFonts.set(key, [font])
          }
        const googleFonts = []
        for (const item of groupedFonts) {
          const [, fonts] = item
          const font = fonts[0]
          if (font?.source === 'google') {
            const name = font.name.replace(' ', '+')
            const hasItalic = fonts.some((x) => x.style === 'italic')
            const attributeKeys = hasItalic ? 'ital,wght' : 'wght'
            const attributeValues = fonts
              .map((x) => {
                if (hasItalic) {
                  if (x.style === 'italic') return `1,${x.weight}`
                  return `0,${x.weight}`
                }
                return x.weight
              })
              .join(';')
            const url = `https://fonts.googleapis.com/css2?family=${name}${
              attributeValues ? `:${attributeKeys}@${attributeValues}` : ''
            }&display=swap`
            googleFonts.push(url)
          }
        }

        return c.html(
          <>
            <script src="https://cdn.tailwindcss.com" />
            <script>
              {html`
                tailwind.config = {
                  plugins: [{
                    handler({ addBase }) {
                      addBase({ 'html': { 'line-height': 1.2 } })
                    },
                  }],
                }
              `}
            </script>
            <style
              // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
              dangerouslySetInnerHTML={{
                __html: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Material+Icons');body{display:flex;height:100%;margin:0;tab-size:8;font-family:Inter,sans-serif;overflow:hidden}body>div,body>div *{box-sizing:border-box;display:flex}body{background:#1A1A19;}link,script,style{position: absolute;width: 1px;height: 1px;padding: 0;margin: -1px;overflow: hidden;clip: rect(0, 0, 0, 0);white-space: nowrap;border-width: 0;}`,
              }}
            />

            {Boolean(googleFonts.length) && (
              <>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                  rel="preconnect"
                  href="https://fonts.gstatic.com"
                  crossOrigin
                />
                {googleFonts.map((url) => (
                  <link href={url} rel="stylesheet" />
                ))}
              </>
            )}

            <div
              className="bg-black"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
              dangerouslySetInnerHTML={{ __html }}
              style={{ height, width }}
            />
          </>,
        )
      }

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
              <meta property="og:image" content={ogImageUrl ?? imageUrl} />
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

    return this
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
    if (!frog.dev) frog.dev = this.dev
    if (!frog.headers) frog.headers = this.headers
    if (!frog.hubApiUrl) frog.hubApiUrl = this.hubApiUrl
    if (!frog.hub) frog.hub = this.hub
    if (!frog.imageOptions) frog.imageOptions = this.imageOptions
    if (!frog.origin) frog.origin = this.origin
    if (!frog.secret) frog.secret = this.secret
    if (!frog.ui) frog.ui = this.ui
    if (!frog.verify) frog.verify = this.verify

    this.hono.route(path, frog.hono)

    return this
  }

  transaction: HandlerInterface<env, 'transaction', schema, basePath> = (
    ...parameters: any[]
  ) => {
    const [path, middlewares, handler, options = {}] = getRouteParameters<
      env,
      TransactionHandler<env>
    >(...parameters)

    const { verify = this.verify } = options

    this.hono.post(parseHonoPath(path), ...middlewares, async (c) => {
      const url = getRequestUrl(c.req)
      const origin = this.origin ?? url.origin
      const { context } = getTransactionContext<env, string, {}, _state>({
        context: await requestBodyToContext(c, {
          hub:
            this.hub ||
            (this.hubApiUrl ? { apiUrl: this.hubApiUrl } : undefined),
          secret: this.secret,
          verify,
          origin,
        }),
        req: c.req,
      })
      const response = await handler(context)
      if (response instanceof Response) return response
      return c.json(response.data)
    })

    return this
  }

  use: MiddlewareHandlerInterface<env, schema, basePath> = (...args: any[]) => {
    this.hono.use(...args)
    return this as any
  }
}
