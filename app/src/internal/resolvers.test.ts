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
    const stack = resolvers({
      outbound: { allowedRepos: [upstream], enabled: true },
      installation: async () => client(instance.url),
      self,
    })

    await expect(stack.readConfig(upstream)).rejects.toMatchObject({ status: 503 })
  })

  test('behavior: reads private consent with the target installation client', async () => {
    const sender = await github()
    const target = await github(
      {},
      {
        files: {
          [upstream]: {
            '.agents/friction-log/config.json': JSON.stringify({ inbound: { enabled: true } }),
          },
        },
      },
    )
    const stack = resolvers({
      outbound: { allowedRepos: [upstream], enabled: true },
      installation: async () => client(target.url),
      self,
    })

    await expect(stack.readConfig(upstream)).resolves.toEqual({ enabled: true })
    expect(sender.requests).toEqual([])
    expect(target.requests.some((request) => request.path.includes('/contents/'))).toBe(true)
  })

  test('error: reports a missing target installation', async () => {
    const stack = resolvers({
      outbound: { allowedRepos: [upstream], enabled: true },
      installation: async () => undefined,
      self,
    })

    await expect(stack.readConfig(upstream)).rejects.toMatchObject({
      message: 'Frog is not installed on `wevm/viem`.',
      repo: upstream,
    })
  })
})
