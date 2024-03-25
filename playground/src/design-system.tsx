import { Frog } from 'frog'
import { createSystem } from 'frog/ui'

const { Box, Cover, HStack, VStack, tokens } = createSystem({
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
})
  .frame('/', (c) => {
    return c.res({
      image: (
        <Cover backgroundColor="background" padding="32">
          <Cover
            backgroundColor="background200"
            borderRadius="8"
            justifyContent="center"
            padding="32"
            gap="32"
          >
            <VStack gap="4">
              <Box fontSize="32" fontWeight="700" width="100%">
                FrogUI 🐸
              </Box>
              <Box color="text200" fontSize="20">
                Build consistent frame experiences
              </Box>
            </VStack>
          </Cover>
        </Cover>
      ),
    })
  })
  .frame('/cover', (c) => {
    return c.res({
      image: (
        <Cover backgroundColor="background" padding="24">
          <VStack gap="4" flexGrow="1">
            <Box fontSize="32" fontWeight="700" width="100%">
              {'<Cover>'}
            </Box>
            <Box color="text200">Covers the parent element.</Box>
            <Cover backgroundColor="background200" padding="16" marginTop="16">
              <Cover
                alignItems="center"
                backgroundColor="red"
                justifyContent="center"
              >
                This is a {'<Cover>'} component.
              </Cover>
            </Cover>
          </VStack>
        </Cover>
      ),
    })
  })
  .frame('/vstack', (c) => {
    return c.res({
      image: (
        <Cover backgroundColor="background" padding="24">
          <VStack gap="4" flexGrow="1">
            <Box fontSize="32" fontWeight="700" width="100%">
              {'<VStack>'}
            </Box>
            <Box color="text200">Vertical Stack</Box>
            <Cover backgroundColor="background200" padding="16" marginTop="16">
              <VStack flex="1" gap="16">
                <Box backgroundColor="red" flex="1" />
                <Box backgroundColor="red" flex="1" />
                <Box backgroundColor="red" flex="1" />
              </VStack>
            </Cover>
          </VStack>
        </Cover>
      ),
    })
  })
  .frame('/hstack', (c) => {
    return c.res({
      image: (
        <Cover backgroundColor="background" padding="24">
          <VStack gap="4" flexGrow="1">
            <Box fontSize="32" fontWeight="700" width="100%">
              {'<HStack>'}
            </Box>
            <Box color="text200">Horizontal Stack</Box>
            <Cover backgroundColor="background200" padding="16" marginTop="16">
              <HStack flex="1" gap="16" flexWrap="wrap">
                <Box backgroundColor="red" flex="1" height="100%" />
                <Box backgroundColor="red" flex="1" height="100%" />
                <Box backgroundColor="red" flex="1" height="100%" />
              </HStack>
            </Cover>
          </VStack>
        </Cover>
      ),
    })
  })
