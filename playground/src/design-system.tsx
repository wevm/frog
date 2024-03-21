import { Frog } from 'frog'
import { colors, createSystem } from 'frog/ui'

const { Box, Cover, tokens } = createSystem({
  colors: colors.dark,
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
          backgroundColor="background/elevated"
          borderRadius="16px"
          justifyContent="center"
          padding="64px"
          gap="32px"
        >
          <Box gap="8px">
            <Box fontSize="64px" fontWeight="700" width="100%">
              FrogUI 🐸
            </Box>
            <Box color="text/secondary" fontSize="40px">
              Build consistent frame experiences
            </Box>
          </Box>
        </Cover>
      </Cover>
    ),
  })
})
