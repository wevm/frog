import { App, Octokit } from 'octokit'
import * as client from './client.js'

describe('comments', () => {
  test('security: grants one repository only Issues write access', async () => {
    const auth = vi.fn(async () => ({ token: 'installation-token' }))
    const app = { octokit: { auth } } as unknown as Pick<App, 'octokit'>

    const comments = await client.comments(app, {
      installation: 42,
      repo: 'wevm/frog',
    })

    expect(auth).toHaveBeenCalledWith({
      installationId: 42,
      permissions: { issues: 'write' },
      repositoryNames: ['frog'],
      type: 'installation',
    })
    expect(comments).toBeInstanceOf(Octokit)
    await expect(comments.auth()).resolves.toMatchObject({ token: 'installation-token' })
  })
})
