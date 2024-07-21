import { Button, Frog } from 'frog'
import { Heading, VStack, vars } from './ui.js'

export const app = new Frog<{ State: { counter: number } }>({
  ui: { vars },
  initialState: { counter: 0 },
  verify: false,
  title: 'Initial',
})
  .frame('/', (c) => {
    c.deriveState((prev) => {
      prev.counter++
    })
    return c.res({
      image: '/refreshing-image/cool-parameter',
      intents: [<Button>Check again</Button>],
    })
  })
  .image('/refreshing-image/:param', (c) => {
    return c.res({
      imageOptions: {
        headers: {
          'Cache-Control': 'max-age=0',
        },
      },
      image: (
        <VStack grow gap="4">
          <Heading color="text400">
            Current time: {new Date().toISOString()}. Counter:{' '}
            {c.previousState.counter}
          </Heading>
        </VStack>
      ),
    })
  })
