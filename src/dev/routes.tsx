import { Message } from '@farcaster/core'
import { bytesToHex } from '@noble/curves/abstract/utils'
import type { Env, Schema } from 'hono'
import { inspectRoutes } from 'hono/dev'
import { jsxRenderer } from 'hono/jsx-renderer'
import { validator } from 'hono/validator'

import type { FarcBase } from '../farc-base.js'
import { parsePath } from '../utils/parsePath.js'
import { Dev, Preview, Style } from './components.js'
import {
  fetchFrameMessage,
  getData,
  getRoutes,
  htmlToFrame,
  htmlToState,
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
      const routes = getRoutes(baseUrl, inspectRoutes(app.hono))

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
        const error = response.status !== 200 ? response.statusText : undefined
        if (response.status !== 200) response = await fetch(baseUrl)

        const text = await response.text()
        // TODO: handle redirects
        const frame = htmlToFrame(text)
        const state = htmlToState(text)
        const routes = getRoutes(baseUrl, inspectRoutes(app.hono))

        return c.render(
          <Preview {...{ baseUrl, error, frame, routes, state }} />,
        )
      },
    )

  app.hono.post(
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

      return c.json({
        success: response.redirected,
        redirectUrl: response.url,
      })
    },
  )
}
