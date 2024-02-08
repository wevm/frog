import type { FrameContext } from './_lib/index.js'

declare module 'hono' {
  interface ContextRenderer {
    (
      content: JSX.Element | null,
      props?: { context: FrameContext; intents: JSX.Element },
    ): Response
  }
}
