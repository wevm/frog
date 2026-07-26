import { Octokit } from 'octokit'
import { github } from '../../../test/github.js'
import { fromRegistry, resolvers } from './resolvers.js'

const self = 'acme/app'
const upstream = 'wevm/viem'

function client(url: string): Octokit {
  return new Octokit({
    auth: 'token',
    baseUrl: url,
    retry: { enabled: false },
    throttle: { enabled: false },
  })
}

describe('fromRegistry', () => {
  test('behavior: undefined when a package does not exist', async () => {
    const instance = await github()
    await expect(
      fromRegistry('missing', { url: `${instance.url}/registry` }),
    ).resolves.toBeUndefined()
  })

  test('error: propagates a transient registry failure', async () => {
    const instance = await github({}, { registryErrors: { viem: 503 } })
    await expect(fromRegistry('viem', { url: `${instance.url}/registry` })).rejects.toThrow(
      'npm registry returned 503',
    )
  })
})

describe('resolvers', () => {
  test('error: propagates a transient target config failure', async () => {
    const instance = await github({}, { errors: { [upstream]: 503 } })
    const stack = resolvers({ allowedRepos: [upstream], client: client(instance.url), self })

    await expect(stack.readConfig(upstream)).rejects.toMatchObject({ status: 503 })
  })
})
