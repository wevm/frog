import { Frog } from 'frog'
import type { MiddlewareHandler } from 'hono'

import { neynarMiddleware } from './neynar.js'

type EchoMiddlewareVariables = {
  echo: (str: string) => string
}

const echoMiddleware: MiddlewareHandler<{
  Variables: EchoMiddlewareVariables
}> = async (c, next) => {
  c.set('echo', (str) => str)
  await next()
}

export const app = new Frog()
  .use(echoMiddleware)
  .frame('/', (c) => {
    return c.res({
      image: (
        <div style={{ color: 'white', display: 'flex', fontSize: 60 }}>
          {c.var.echo('hello world!')}
        </div>
      ),
    })
  })
  .frame('/neynar', neynarMiddleware, (c) => {
    return c.res({
      image: (
        <div style={{ color: 'white', display: 'flex', fontSize: 60 }}>
          {c.var.interactor?.displayName}
        </div>
      ),
    })
  })
