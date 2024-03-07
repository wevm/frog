import { App } from './App.js'
import { Provider, type Props, dataId } from './lib/context.js'

type EntryServer = {
  path: string
  providerProps: Props
}

export function EntryServer(props: EntryServer) {
  const { path, providerProps } = props
  return (
    <html lang="en">
      <head>
        <title>frame: {path || '/'}</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        {/* Inlined during build */}
        <script type="module" src="/node_modules/frog/dev/entry-client.tsx" />
        <link rel="stylesheet" href="/node_modules/frog/dev/styles.css" />

        {/* TODO: Load from file system */}
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
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
  )
}
