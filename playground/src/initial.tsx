import { Button, Frog } from 'frog'
import { Heading, VStack, vars } from './ui.js'

export const app = new Frog({
  ui: { vars },
})
  .frame(
    '/',
    (c) => {
      return c.res({
        image: (
          <VStack grow gap="4">
            <Heading color="text400">
              (clicked) Current time: {new Date().toISOString()}
            </Heading>
          </VStack>
        ),
      })
    },
    {
      initial: {
        refreshing: true,
        image: () => (
          <VStack grow gap="4">
            <Heading color="text400">
              Current time: {new Date().toISOString()}
            </Heading>
          </VStack>
        ),
        intents: [<Button>Check again</Button>],
      },
    },
  )
  .frame(
    '/square',
    (c) => {
      return c.res({
        image: (
          <VStack grow gap="4">
            <Heading color="text400">
              (clicked) Current time: {new Date().toISOString()}
            </Heading>
          </VStack>
        ),
      })
    },
    {
      initial: {
        refreshing: true,
        image: () => (
          <VStack grow gap="4">
            <Heading color="text400">
              Current time: {new Date().toISOString()}
            </Heading>
          </VStack>
        ),
        imageAspectRatio: '1:1',
        intents: [<Button>Check again</Button>],
      },
    },
  )
  .frame(
    '/frozen',
    (c) => {
      return c.res({
        image: (
          <VStack grow gap="4">
            <Heading color="text400">
              (clicked) Current time: {new Date().toISOString()}
            </Heading>
          </VStack>
        ),
      })
    },
    {
      initial: {
        refreshing: false,
        image: (
          <VStack grow gap="4">
            <Heading color="text400">
              Current time (frozen): {new Date().toISOString()}
            </Heading>
          </VStack>
        ),
        intents: [<Button>Check again</Button>],
      },
    },
  )
  .frame(
    '/frozen/square',
    (c) => {
      return c.res({
        image: (
          <VStack grow gap="4">
            <Heading color="text400">
              (clicked) Current time: {new Date().toISOString()}
            </Heading>
          </VStack>
        ),
      })
    },
    {
      initial: {
        refreshing: false,
        image: (
          <VStack grow gap="4">
            <Heading color="text400">
              Current time: {new Date().toISOString()}
            </Heading>
          </VStack>
        ),
        imageAspectRatio: '1:1',
        intents: [<Button>Check again</Button>],
      },
    },
  )
