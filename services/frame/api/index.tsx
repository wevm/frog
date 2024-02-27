import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'

type State = {
  featureIndex: number
  stage: 'start' | 'features' | 'end'
}

export const config = {
  runtime: 'edge',
}

export const app = new Frog<State>({
  basePath: '/api',
  browserLocation: 'https://frog.fm',
  initialState: {
    featureIndex: 0,
    stage: 'start',
  },
})

app.frame('/', ({ buttonValue, deriveState }) => {
  const featureImages = [
    '/write-in-jsx.png',
    '/connect-frames.png',
    '/manage-state.png',
    '/local-devtools.png',
    '/deploy-anywhere.png',
  ]

  const { featureIndex, stage } = deriveState((previousState) => {
    if (buttonValue === 'features') previousState.stage = 'features'
    if (buttonValue === 'back') {
      if (previousState.featureIndex === 0) previousState.stage = 'start'
      else previousState.featureIndex--
    }
    if (buttonValue === 'next') {
      if (previousState.featureIndex === featureImages.length - 1)
        previousState.stage = 'end'
      else previousState.featureIndex++
    }
  })

  if (stage === 'features')
    return {
      image: featureImages[featureIndex],
      intents: [
        <Button value="back">← Back</Button>,
        <Button value="next">Next →</Button>,
      ],
    }
  if (stage === 'end')
    return {
      image: '/npm.png',
      intents: [
        <Button.Link href="https://frog.fm/getting-started">
          Get Started
        </Button.Link>,
        <Button.Link href="https://github.com/wevm/frog">GitHub</Button.Link>,
      ],
    }
  return {
    image: '/og.png',
    intents: [
      <Button value="features">Features →</Button>,
      <Button.Link href="https://frog.fm">Docs</Button.Link>,
      <Button.Link href="https://github.com/wevm/frog">GitHub</Button.Link>,
    ],
  }
})

export const GET = handle(app)
export const POST = handle(app)
