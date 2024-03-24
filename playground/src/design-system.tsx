import { Frog } from 'frog'
import { createSystem } from 'frog/ui'

const { Box, Cover, VStack, tokens } = createSystem({
  fonts: {
    default: [
      {
        name: 'Open Sans',
        source: 'google',
        weight: 400,
      },
      {
        name: 'Open Sans',
        source: 'google',
        weight: 600,
      },
      {
        name: 'Open Sans',
        source: 'google',
        weight: 700,
      },
    ],
  },
})

export const app = new Frog({
  tokens,
}).frame('/', (c) => {
  return c.res({
    image: (
      <Cover backgroundColor="background" padding="48px">
        <Cover
          backgroundColor="background200"
          borderRadius="16px"
          justifyContent="center"
          padding="64px"
          gap="32px"
        >
          <VStack gap="8px">
            <Box fontSize="64px" fontWeight="700" width="100%">
              FrogUI 🐸
            </Box>
            <Box color="text200" fontSize="40px">
              Build consistent frame experiences
            </Box>
          </VStack>
        </Cover>
      </Cover>
    ),
  })
})
