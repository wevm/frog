// import { serveStatic } from '@hono/node-server/serve-static'
import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'

type State = {
  featureIndex: number
}

export const config = {
  runtime: 'edge',
}

export const app = new Frog<State>({
  assetsPath: '/',
  basePath: '/api',
  browserLocation: 'https://frog.fm',
  initialState: {
    featureIndex: 0,
  },
})

// app.use(
//   '/*',
//   serveStatic({
//     root: './public',
//   }),
// )

app.frame('/', () => {
  return {
    image: '/og.png',
    intents: [
      <Button action="/features">Features →</Button>,
      <Button.Link href="https://frog.fm">Docs</Button.Link>,
      <Button.Link href="https://github.com/wevm/frog">GitHub</Button.Link>,
    ],
  }
})

app.frame('/features', ({ buttonValue, deriveState }) => {
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

  return {
    image: featureImages[featureIndex],
    intents: [
      <Button action={featureIndex === 0 ? '/api' : undefined} value="back">
        ← Back
      </Button>,
      <Button
        action={
          featureIndex === featureImages.length - 1 ? '/api/end' : undefined
        }
        value="next"
      >
        Next →
      </Button>,
    ],
  }
})

app.frame('/end', () => {
  return {
    image: '/npm.png',
    intents: [
      <Button.Link href="https://frog.fm/getting-started">
        Get Started
      </Button.Link>,
      <Button.Link href="https://github.com/wevm/frog">GitHub</Button.Link>,
    ],
  }
})

export const GET = handle(app)
export const POST = handle(app)
