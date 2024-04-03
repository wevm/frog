import { Frog } from 'frog'
import { Heading, VStack, vars } from './ui.js'

export const app = new Frog({
  ui: { vars },
}).frame('/', (c) => {
  return c.res({
    image: (
      <VStack grow gap="4">
        <Heading>Open Sans (normal)</Heading>
        <Heading weight="600">Open Sans (bold)</Heading>
        <Heading font="madimi">Madimi One</Heading>
      </VStack>
    ),
  })
})
