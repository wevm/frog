import { Frog } from 'frog'
import type { MiddlewareHandler } from 'hono'

import { neynarMiddleware } from './neynar'

type EchoMiddlewareVariables = {
  echo: (str: string) => string
}

const echoMiddleware: MiddlewareHandler<{
  Variables: EchoMiddlewareVariables
}> = async (c, next) => {
  c.set('echo', (str) => str)
  await next()
}

export const app = new Frog().use(echoMiddleware)

// app.frame('/', (c) => {})

// app.use(echoMiddleware)

app.frame('/', (c) => {
  return c.res({
    image: (
      <div style={{ color: 'white', display: 'flex', fontSize: 60 }}>
        {c.var.echo('hello world!')}
      </div>
    ),
  })
})

app.frame('/neynar', neynarMiddleware, (c) => {
  return c.res({
    image: (
      <div style={{ color: 'white', display: 'flex', fontSize: 60 }}>
        {c.var.interactor?.displayName}
      </div>
    ),
  })
})

app.frame('/neynar', neynarMiddleware, echoMiddleware, (c) => {
  return c.res({
    image: (
      <div style={{ color: 'white', display: 'flex', fontSize: 60 }}>
        {c.var.interactor?.displayName}
      </div>
    ),
  })
})
