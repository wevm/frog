import { Button, Frog, TextInput } from 'frog'
import * as hubs from 'frog/hubs'
import { farcaster, openFrame } from 'frog/renderers'
import { Box, Heading, vars } from './ui.js'

export const app = new Frog({
  hub: hubs.frog(),
  ui: { vars },
  verify: 'silent',
  renderers: [
    farcaster(),
    openFrame({
      accepts: [{ protocolIdentifier: 'xmtp', value: '2024-02-01' }],
    }),
  ],
}).frame('/', (c) => {
  const { buttonValue, inputText, status } = c
  const fruit = inputText || buttonValue
  return c.res({
    action: '/action',
    image: (
      <Box
        grow
        background={
          status === 'response'
            ? { custom: 'linear-gradient(to right, #432889, #17101F)' }
            : 'background'
        }
        alignHorizontal="center"
        alignVertical="center"
      >
        <Heading style="italic">
          {status === 'response'
            ? `Nice choice.${fruit ? ` ${fruit.toUpperCase()}!!` : ''}`
            : 'Welcome 🐸'}
        </Heading>
      </Box>
    ),
    intents: [
      <TextInput placeholder="Enter custom fruit" />,
      <Button value="apples">Apples</Button>,
      <Button value="oranges">Oranges</Button>,
      <Button value="bananas">Bananas</Button>,
      status === 'response' && <Button.Reset>Reset</Button.Reset>,
    ],
  })
})
