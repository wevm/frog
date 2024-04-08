import { Frog } from 'frog'
import { Heading, VStack, vars } from './ui.js'

export const app = new Frog({
  ui: { vars },
  headers: { 'cache-control': 'max-age=0' },
}).frame('/', (c) => {
  return c.res({
    image: (
      <VStack grow gap="4">
        <Heading color="text400">
          Current time: {new Date().toISOString()}
        </Heading>
      </VStack>
    ),
  })
})
