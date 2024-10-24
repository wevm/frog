import { Button, Frog } from 'frog'
import { devtools } from 'frog/dev'
import { handle } from 'frog/next'
import { serveStatic } from 'frog/serve-static'

type State = {
  featureIndex: number
}

export const config = {
  runtime: 'edge',
}

export const app = new Frog<{ State: State }>({
  assetsPath: '/',
  basePath: '/api',
  browserLocation: 'https://frog.fm',
  title: 'Frog – Framework for Farcaster Frames',
  initialState: {
    featureIndex: 0,
  },
})

app.frame('/', (c) => {
  return c.res({
    image: '/og.png',
    intents: [
      <Button action="/features">Features →</Button>,
      <Button.Link href="https://frog.fm">Docs</Button.Link>,
      <Button.Link href="https://github.com/wevm/frog">GitHub</Button.Link>,
    ],
  })
})

app.frame('/features', (c) => {
  const { buttonValue, deriveState } = c

  const featureImages = [
    '/write-in-jsx.png',
    '/connect-frames.png',
    '/manage-state.png',
    '/local-devtools.png',
    '/deploy-anywhere.png',
  ]

  const { featureIndex } = deriveState((previousState) => {
    if (buttonValue === 'back') previousState.featureIndex--
    if (buttonValue === 'next') previousState.featureIndex++
  })

  return c.res({
    image: featureImages[featureIndex],
    intents: [
      <Button action={featureIndex === 0 ? '/' : undefined} value="back">
        ← Back
      </Button>,
      <Button
        action={featureIndex === featureImages.length - 1 ? '/end' : undefined}
        value="next"
      >
        Next →
      </Button>,
    ],
  })
})

app.frame('/end', (c) => {
  return c.res({
    image: '/npm.png',
    intents: [
      <Button.Link href="https://frog.fm/getting-started">
        Get Started
      </Button.Link>,
      <Button.Link href="https://github.com/wevm/frog">GitHub</Button.Link>,
    ],
  })
})

// @ts-ignore
const isEdgeFunction = typeof EdgeRuntime !== 'undefined'
devtools(app, isEdgeFunction ? { assetsPath: '/.frog' } : { serveStatic })

export const GET = handle(app)
export const POST = handle(app)
