import { Hono } from 'hono'
import { html } from 'hono/html'

export type ClientRouteOptions = {
  basePath: string
}

export function clientRoutes(_options: ClientRouteOptions) {
  return new Hono().get('/', async (c) => {
    return c.html(
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>frog</title>

          <script type="module">
            {html`globalThis.__FROG_BASE_URL__ = '${c.req.url}'`}
          </script>

          <>{/*--client-outlet--*/}</>
        </head>
        <body>
          <div id="root" />
        </body>
      </html>,
    )
  })
}
