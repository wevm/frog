import { Button, Frog } from 'frog'
import {
  Box,
  Column,
  Columns,
  Cover,
  HStack,
  Row,
  Rows,
  Spacer,
  VStack,
  tokens,
} from './ui'

export const app = new Frog({
  tokens,
  // imageOptions: {
  //   width: 2048,
  //   height: 2048,
  // },
  // imageAspectRatio: '1:1',
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
      intents: [<Button action="/columns">→</Button>],
    })
  })
  .frame('/columns', (c) => {
    return c.res({
      image: (
        <Cover backgroundColor="background" padding="24">
          <VStack gap="4" flexGrow="1">
            <Box fontSize="32" fontWeight="700" width="100%">
              {'<Columns>'}
            </Box>
            <Box color="text200">Columned layout</Box>
            <Spacer size="16" />
            <Cover backgroundColor="background200" padding="16">
              <VStack flex="1" gap="16">
                <Columns flex="1" gap="8">
                  <Column backgroundColor="red" height="100%" />
                  <Column backgroundColor="red" height="100%" />
                  <Column backgroundColor="red" height="100%" />
                  <Column backgroundColor="red" height="100%" />
                </Columns>
                <Columns flex="1" gap="8">
                  <Column backgroundColor="red" height="100%" width="1/3" />
                  <Column backgroundColor="red" height="100%" width="2/3" />
                </Columns>
              </VStack>
            </Cover>
          </VStack>
        </Cover>
      ),
      intents: [
        <Button action="/">←</Button>,
        <Button action="/cover">→</Button>,
      ],
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
            <Spacer size="16" />
            <Cover backgroundColor="background200" padding="16">
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
      intents: [
        <Button action="/columns">←</Button>,
        <Button action="/hstack">→</Button>,
      ],
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
            <Spacer size="16" />
            <Cover backgroundColor="background200" padding="16">
              <VStack flex="1" gap="16">
                <HStack flex="1" gap="16" wrap>
                  <Box backgroundColor="red" flex="1" height="100%" />
                  <Box backgroundColor="red" flex="1" height="100%" />
                  <Box backgroundColor="red" flex="1" height="100%" />
                </HStack>
                <HStack
                  alignVertical="center"
                  alignHorizontal="space-between"
                  flex="1"
                  gap="16"
                >
                  <Box backgroundColor="red" width="48" height="48" />
                  <Box backgroundColor="red" width="48" height="48" />
                  <Box backgroundColor="red" width="48" height="48" />
                  <Box backgroundColor="red" width="48" height="48" />
                </HStack>
              </VStack>
            </Cover>
          </VStack>
        </Cover>
      ),
      intents: [
        <Button action="/cover">←</Button>,
        <Button action="/rows">→</Button>,
      ],
    })
  })
  .frame('/rows', (c) => {
    return c.res({
      image: (
        <Cover backgroundColor="background" padding="24">
          <VStack gap="4" flexGrow="1">
            <Box fontSize="32" fontWeight="700" width="100%">
              {'<Rows>'}
            </Box>
            <Box color="text200">Row layout</Box>
            <Spacer size="16" />
            <Cover backgroundColor="background200" padding="16">
              <HStack flex="1" gap="16">
                <Rows flex="1" gap="8">
                  <Row backgroundColor="red" width="100%" />
                  <Row backgroundColor="red" width="100%" />
                  <Row backgroundColor="red" width="100%" />
                  <Row backgroundColor="red" width="100%" />
                </Rows>
                <Rows flex="1" gap="8">
                  <Row backgroundColor="red" width="100%" height="1/3" />
                  <Row backgroundColor="red" width="100%" height="2/3" />
                </Rows>
              </HStack>
            </Cover>
          </VStack>
        </Cover>
      ),
      intents: [
        <Button action="/hstack">←</Button>,
        <Button action="/spacer">→</Button>,
      ],
    })
  })
  .frame('/spacer', (c) => {
    return c.res({
      image: (
        <Cover backgroundColor="background" padding="24">
          <VStack gap="4" flexGrow="1">
            <Box fontSize="32" fontWeight="700" width="100%">
              {'<Spacer>'}
            </Box>
            <Box color="text200">Space betwen elements</Box>
            <Spacer size="16" />
            <Cover backgroundColor="background200" padding="16">
              <HStack flex="1" gap="16">
                <VStack flex="1" height="100%" gap="16">
                  <Box backgroundColor="red" flex="1" />
                  <Spacer />
                  <Box backgroundColor="red" flex="1" />
                </VStack>
                <VStack flex="1" height="100%" gap="16">
                  <Box backgroundColor="red" flex="1" />
                  <Spacer size="4" />
                  <Box backgroundColor="red" flex="1" />
                </VStack>
              </HStack>
            </Cover>
          </VStack>
        </Cover>
      ),
      intents: [
        <Button action="/rows">←</Button>,
        <Button action="/vstack">→</Button>,
      ],
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
            <Spacer size="16" />
            <Cover backgroundColor="background200" padding="16">
              <HStack flex="1" gap="16">
                <VStack flex="1" height="100%" gap="16">
                  <Box backgroundColor="red" flex="1" />
                  <Box backgroundColor="red" flex="1" />
                  <Box backgroundColor="red" flex="1" />
                </VStack>
                <VStack
                  alignHorizontal="center"
                  alignVertical="space-between"
                  flex="1"
                  height="100%"
                  gap="16"
                >
                  <Box backgroundColor="red" width="48" height="24" />
                  <Box backgroundColor="red" width="48" height="24" />
                  <Box backgroundColor="red" width="48" height="24" />
                </VStack>
              </HStack>
            </Cover>
          </VStack>
        </Cover>
      ),
      intents: [<Button action="/spacer">←</Button>],
    })
  })
