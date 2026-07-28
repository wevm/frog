import { Octokit } from 'octokit'
import { github } from '../../../test/github.js'
import { commentMarker, issueMarker, wake } from './signal.js'

const app = 'frog-fm[bot]'
const repo = 'acme/app'

function client(url: string): Octokit {
  return new Octokit({
    auth: 'token',
    baseUrl: url,
    retry: { enabled: false },
    throttle: { enabled: false },
  })
}

test('behavior: repeated wakeups reuse one closed issue and one comment', async () => {
  const instance = await github()
  const octokit = client(instance.url)

  const first = await wake(octokit, { author: app, delivery: 'delivery-1', repo })
  const body = instance.comments(repo, first.issue)[0]
  const second = await wake(octokit, { author: app, delivery: 'delivery-2', repo })

  expect(second).toEqual(first)
  expect(instance.issues.get(repo)).toHaveLength(1)
  expect(instance.issues.get(repo)?.[0]).toMatchObject({
    body: expect.stringContaining(issueMarker),
    state: 'closed',
  })
  expect(instance.comments(repo, first.issue)).toHaveLength(1)
  expect(instance.comments(repo, first.issue)[0]).toContain(commentMarker)
  expect(instance.comments(repo, first.issue)[0]).not.toBe(body)
})

test('security: copied control markers owned by another user are ignored', async () => {
  const instance = await github(
    {
      [repo]: [
        {
          author: 'contributor',
          body: issueMarker,
          state: 'closed',
          title: 'Copied control issue',
        },
      ],
    },
    { author: app },
  )

  const result = await wake(client(instance.url), {
    author: app,
    delivery: 'delivery-1',
    repo,
  })

  expect(result.issue).toBe(2)
  expect(instance.issues.get(repo)).toHaveLength(2)
})

test('security: an App-authored report containing the control marker is ignored', async () => {
  const instance = await github(
    {
      [repo]: [
        {
          body: `Untrusted report text.\n\n${issueMarker}`,
          state: 'open',
          title: 'Frog reconciliation',
        },
      ],
    },
    { author: app },
  )

  const result = await wake(client(instance.url), {
    author: app,
    delivery: 'delivery-1',
    repo,
  })

  expect(result.issue).toBe(2)
  expect(instance.issues.get(repo)?.[0]).toMatchObject({ state: 'open' })
  expect(instance.issues.get(repo)).toHaveLength(2)
})
