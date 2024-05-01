import { Button, Frog, TextInput } from 'frog'

import { Box, Heading, vars } from './ui.js'

export const app = new Frog({
  ui: { vars },
})
  .frame('/', (c) =>
    c.res({
      image: (
        <div
          tw="flex"
          style={{
            alignItems: 'center',
            background: 'linear-gradient(to right, #432889, #17101F)',
            backgroundSize: '100% 100%',
            flexDirection: 'column',
            flexWrap: 'nowrap',
            height: '100%',
            justifyContent: 'center',
            textAlign: 'center',
            width: '100%',
          }}
        >
          <div
            style={{
              color: 'white',
              fontSize: 60,
              fontStyle: 'normal',
              letterSpacing: '-0.025em',
              lineHeight: 1.4,
              marginTop: 30,
              padding: '0 120px',
              whiteSpace: 'pre-wrap',
            }}
          >
            Add Cast Action
          </div>
        </div>
      ),
      intents: [
        <Button.AddCastAction action="/action-message">
          Message
        </Button.AddCastAction>,
        <Button.AddCastAction action="/action-frame">
          Frame
        </Button.AddCastAction>,
      ],
    }),
  )
  .castAction(
    '/action-message',
    async (c) => {
      console.log(
        `Cast Action to ${JSON.stringify(c.actionData.castId)} from ${
          c.actionData.fid
        }`,
      )
      if (Math.random() > 0.5) return c.error({ message: 'Action failed :(' })
      return c.message({
        message: 'Action Succeeded',
        link: 'https://frog.fm/',
      })
    },
    {
      name: 'Log This!',
      icon: 'log',
      description: 'This cast action will log something and return a message!',
    },
  )
  .castAction(
    '/action-frame',
    async (c) => {
      console.log(
        `Cast Action to ${JSON.stringify(c.actionData.castId)} from ${
          c.actionData.fid
        }`,
      )
      if (Math.random() > 0.5) return c.error({ message: 'Action failed :(' })

      return c.frame({
        path: '/action-frame-response',
      })
    },
    {
      name: 'Log This!',
      icon: 'log',
      description: 'This cast action will log something and invoke a frame!',
    },
  )
  .frame('/action-frame-response', async (c) => {
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
              : 'Cast Action Frame Response 🐸'}
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
