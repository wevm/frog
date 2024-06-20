import { Button, Frog } from 'frog'
import { serveStatic } from 'frog/serve-static'
import { heroicons, lucide, radixIcons } from 'frog/ui/icons'

import {
  Box,
  Column,
  Columns,
  Divider,
  HStack,
  Heading,
  Icon,
  Image,
  Row,
  Rows,
  Spacer,
  Text,
  VStack,
  vars,
} from './ui.js'

export const app = new Frog({
  ui: { vars },
  title: 'UI System',
})
  .use('/*', serveStatic({ root: './public' }))
  .frame('/', (c) => {
    return c.res({
      image: (
        <Box backgroundColor="background" grow padding="32">
          <Box
            backgroundColor="background200"
            borderRadius="8"
            grow
            justifyContent="center"
            padding="32"
            gap="32"
          >
            <VStack gap="4">
              <Heading>FrogUI 🐸</Heading>
              <Text color="text200" size="20">
                Build consistent frame experiences
              </Text>
            </VStack>
          </Box>
        </Box>
      ),
      intents: [<Button action="/columns">→</Button>],
    })
  })
  .frame('/columns', (c) => {
    return c.res({
      image: (
        <Box backgroundColor="background" grow padding="24">
          <VStack gap="4" grow>
            <Heading>{'<Columns>'}</Heading>
            <Text color="text200" size="18">
              Columned layout
            </Text>
            <Spacer size="16" />
            <Box backgroundColor="background200" grow padding="16">
              <VStack gap="16" grow>
                <Columns gap="8" grow>
                  <Column backgroundColor="red" />
                  <Column backgroundColor="red" />
                  <Column backgroundColor="red" />
                  <Column backgroundColor="red" />
                </Columns>
                <Columns gap="8" grow>
                  <Column backgroundColor="red" width="1/3" />
                  <Column backgroundColor="red" width="2/3" />
                </Columns>
              </VStack>
            </Box>
          </VStack>
        </Box>
      ),
      intents: [
        <Button action="/">←</Button>,
        <Button action="/heading">→</Button>,
      ],
    })
  })
  .frame('/divider', (c) => {
    return c.res({
      image: (
        <Box backgroundColor="background" grow padding="24">
          <VStack gap="4" grow>
            <Heading>{'<Divider>'}</Heading>
            <Spacer size="16" />
            <Box backgroundColor="background200" grow padding="16">
              <Box backgroundColor="red" />
              <Columns gap="8" grow>
                <Column backgroundColor="red" width="1/2" />
                <Divider />
                <Rows gap="8" grow>
                  <Row backgroundColor="red" height="1/3" />
                  <Divider />
                  <Row backgroundColor="red" height="2/3" padding="16">
                    <HStack height="100%" gap="16">
                      <Box backgroundColor="blue" width="38" height="100%" />
                      <Divider />
                      <Box backgroundColor="blue" width="38" height="100%" />
                    </HStack>
                  </Row>
                </Rows>
              </Columns>
            </Box>
          </VStack>
        </Box>
      ),
      intents: [
        <Button action="/columns">←</Button>,
        <Button action="/hstack">→</Button>,
      ],
    })
  })
  .frame('/divider-with-image-handler', (c) => {
    return c.res({
      image: '/divider-with-image-handler/img',
      intents: [
        <Button action="/columns">←</Button>,
        <Button action="/hstack">→</Button>,
      ],
    })
  })
  .image('/divider-with-image-handler/img', (c) => {
    return c.res({
      image: (
        <Box backgroundColor="background" grow padding="24">
          <VStack gap="4" grow>
            <Heading>{'<Divider>'}</Heading>
            <Spacer size="16" />
            <Box backgroundColor="background200" grow padding="16">
              <Box backgroundColor="red" />
              <Columns gap="8" grow>
                <Column backgroundColor="red" width="1/2" />
                <Divider />
                <Rows gap="8" grow>
                  <Row backgroundColor="red" height="1/3" />
                  <Divider />
                  <Row backgroundColor="red" height="2/3" padding="16">
                    <VStack height="100%" gap="16">
                      <Box backgroundColor="blue" width="100%" height="18" />
                      <Divider />
                      <Box backgroundColor="blue" width="100%" height="18" />
                    </VStack>
                  </Row>
                </Rows>
              </Columns>
            </Box>
          </VStack>
        </Box>
      ),
    })
  })
  .frame('/heading', (c) => {
    return c.res({
      image: (
        <Box backgroundColor="background" grow padding="24">
          <VStack gap="4" grow>
            <Heading>{'<Heading>'}</Heading>
            <Spacer size="16" />
            <Box backgroundColor="background200" grow padding="16">
              <VStack gap="4">
                <Heading>Hello world</Heading>
                <Text>This is some text.</Text>
              </VStack>
            </Box>
          </VStack>
        </Box>
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
        <Box backgroundColor="background" grow padding="24">
          <VStack gap="4" grow>
            <Heading>{'<HStack>'}</Heading>
            <Text color="text200" size="18">
              Horizontal Stack
            </Text>
            <Spacer size="16" />
            <Box backgroundColor="background200" grow padding="16">
              <VStack gap="16" grow>
                <HStack gap="16" grow wrap>
                  <Box backgroundColor="red" grow height="100%" />
                  <Box backgroundColor="red" grow height="100%" />
                  <Box backgroundColor="red" grow height="100%" />
                </HStack>
                <HStack
                  alignVertical="center"
                  alignHorizontal="space-between"
                  grow
                  gap="16"
                >
                  <Box backgroundColor="red" width="48" height="48" />
                  <Box backgroundColor="red" width="48" height="48" />
                  <Box backgroundColor="red" width="48" height="48" />
                  <Box backgroundColor="red" width="48" height="48" />
                </HStack>
              </VStack>
            </Box>
          </VStack>
        </Box>
      ),
      intents: [
        <Button action="/heading">←</Button>,
        <Button action="/rows">→</Button>,
      ],
    })
  })
  .frame('/icon', (c) => {
    return c.res({
      image: (
        <Box backgroundColor="background" grow padding="24">
          <VStack gap="4" grow>
            <Heading>{'<Icon>'}</Heading>
            <Spacer size="16" />
            <Box backgroundColor="background200" grow padding="16" height="48">
              <HStack>
                <Icon color="green800" name="zap" size="64" />
                <Icon
                  color="green800"
                  collection={lucide}
                  name="zap"
                  size="64"
                />
                <Icon
                  color="green800"
                  collection={heroicons}
                  name="bolt"
                  size="64"
                />
                <Icon
                  color="green800"
                  collection={radixIcons}
                  name="lightning-bolt"
                  size="64"
                />
              </HStack>
            </Box>
          </VStack>
        </Box>
      ),
      intents: [
        <Button action="/columns">←</Button>,
        <Button action="/hstack">→</Button>,
      ],
    })
  })
  .frame('/image_', (c) => {
    return c.res({
      image: (
        <Box
          backgroundColor="background"
          grow
          paddingRight="24"
          paddingTop="24"
          paddingLeft="24"
          paddingBottom="0"
        >
          <VStack gap="4" grow>
            <Heading>{'<Image>'}</Heading>
            <Spacer size="16" />
            <Box backgroundColor="background200" grow padding="16" height="48">
              <Image borderRadius="96" src="/frog.png" width="100%" />
            </Box>
          </VStack>
        </Box>
      ),
      intents: [
        <Button action="/columns">←</Button>,
        <Button action="/hstack">→</Button>,
      ],
    })
  })
  .frame('/rows', (c) => {
    return c.res({
      image: (
        <Box backgroundColor="background" grow padding="24">
          <VStack gap="4" grow>
            <Heading>{'<Rows>'}</Heading>
            <Text color="text200" size="18">
              Row layout
            </Text>
            <Spacer size="16" />
            <Box backgroundColor="background200" grow padding="16">
              <HStack gap="16" grow>
                <Rows gap="8" grow>
                  <Row backgroundColor="red" />
                  <Row backgroundColor="red" />
                  <Row backgroundColor="red" />
                  <Row backgroundColor="red" />
                </Rows>
                <Rows gap="8" grow>
                  <Row backgroundColor="red" height="1/3" />
                  <Row backgroundColor="red" height="2/3" />
                </Rows>
              </HStack>
            </Box>
          </VStack>
        </Box>
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
        <Box backgroundColor="background" grow padding="24">
          <VStack gap="4" grow>
            <Heading>{'<Spacer>'}</Heading>
            <Text color="text200" size="18">
              Space betwen elements
            </Text>
            <Spacer size="16" />
            <Box backgroundColor="background200" grow padding="16">
              <HStack gap="16" grow>
                <VStack height="100%" grow>
                  <Box backgroundColor="red" height="20" />
                  <Spacer />
                  <Box backgroundColor="red" height="20" />
                </VStack>
                <VStack grow height="100%">
                  <Box backgroundColor="red" grow />
                  <Spacer size="10" />
                  <Box backgroundColor="red" grow />
                </VStack>
              </HStack>
            </Box>
          </VStack>
        </Box>
      ),
      intents: [
        <Button action="/rows">←</Button>,
        <Button action="/vstack">→</Button>,
      ],
    })
  })
  .frame('/text', (c) => {
    return c.res({
      image: (
        <Box backgroundColor="background" grow padding="24">
          <VStack gap="4" grow>
            <Heading>{'<Text>'}</Heading>
            <Spacer size="16" />
            <Box backgroundColor="background200" grow padding="16">
              <VStack alignVertical="space-between" grow>
                <Text size="16">Hello world</Text>
                <Text align="center" size="20" weight="600">
                  Hello world
                </Text>
                <Text align="right" size="32" weight="700">
                  Hello world
                </Text>
              </VStack>
            </Box>
          </VStack>
        </Box>
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
        <Box backgroundColor="background" grow padding="24">
          <VStack gap="4" grow>
            <Heading>{'<VStack>'}</Heading>
            <Text color="text200" size="18">
              Vertical Stack
            </Text>
            <Spacer size="16" />
            <Box backgroundColor="background200" grow padding="16">
              <HStack gap="16" grow>
                <VStack height="100%" gap="16" grow>
                  <Box backgroundColor="red" grow />
                  <Box backgroundColor="red" grow />
                  <Box backgroundColor="red" grow />
                </VStack>
                <VStack
                  alignHorizontal="center"
                  alignVertical="space-between"
                  grow
                  height="100%"
                  gap="16"
                >
                  <Box backgroundColor="red" width="48" height="24" />
                  <Box backgroundColor="red" width="48" height="24" />
                  <Box backgroundColor="red" width="48" height="24" />
                </VStack>
              </HStack>
            </Box>
          </VStack>
        </Box>
      ),
      intents: [<Button action="/spacer">←</Button>],
    })
  })
