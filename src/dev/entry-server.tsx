import { html } from 'hono/html'
import { App } from './App.js'
import { Provider, type ProviderProps, dataId } from './Context.js'

type EntryServer = {
  hasStaticBundle: boolean
  path: string
  providerProps: ProviderProps
  staticPath: string
}

export function EntryServer(props: EntryServer) {
  const { hasStaticBundle, path, providerProps, staticPath } = props
  return (
    <>
      {html`<!DOCTYPE html>`}
      <html lang="en">
        <head>
          <title>frame: {path || '/'}</title>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />

          {hasStaticBundle ? (
            <>
              <link rel="stylesheet" href={`${staticPath}/assets/style.css`} />
              <script type="module" src={`${staticPath}/entry-client.js`} />
            </>
          ) : (
            <>
              <link
                rel="stylesheet"
                href="/node_modules/frog/dev/styles/colors.css"
              />
              <link
                rel="stylesheet"
                href="/node_modules/frog/dev/styles/globals.css"
              />
              <script
                type="module"
                src="/node_modules/frog/dev/entry-client.tsx"
              />
            </>
          )}

          {/* TODO: Load from file system */}
          <link rel="icon" href="https://frog.fm/icon.png" type="image/png" />
        </head>
        <body>
          <div id="root">
            <Provider {...providerProps}>
              <App />
            </Provider>
          </div>
          <script
            id={dataId}
            type="application/json"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
            dangerouslySetInnerHTML={{ __html: JSON.stringify(providerProps) }}
          />
        </body>
      </html>
    </>
  )
}
