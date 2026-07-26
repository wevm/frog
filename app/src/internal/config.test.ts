import { Octokit } from 'octokit'
import { github } from '../../../test/github.js'
import { read } from './config.js'

const repo = 'acme/app'

function client(url: string): Octokit {
  return new Octokit({
    auth: 'token',
    baseUrl: url,
    retry: { enabled: false },
    throttle: { enabled: false },
  })
}

test('error: propagates a transient config failure', async () => {
  const instance = await github({}, { errors: { [repo]: 503 } })
  await expect(read(client(instance.url), { repo })).rejects.toMatchObject({ status: 503 })
})
