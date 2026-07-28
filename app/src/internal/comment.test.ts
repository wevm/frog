import type { Octokit } from 'octokit'
import * as comment from './comment.js'

type Comment = {
  body: string
  id: number
  user: { login: string } | null
}

function client(comments: readonly Comment[]): {
  client: Octokit
  created: { body: string; issue_number: number; owner: string; repo: string }[]
  updated: { body: string; comment_id: number; owner: string; repo: string }[]
} {
  const created: { body: string; issue_number: number; owner: string; repo: string }[] = []
  const updated: { body: string; comment_id: number; owner: string; repo: string }[] = []

  return {
    client: {
      paginate: async () => comments,
      rest: {
        issues: {
          createComment: async (options: (typeof created)[number]) => {
            created.push(options)
            return {}
          },
          listComments: async () => ({ data: comments }),
          updateComment: async (options: (typeof updated)[number]) => {
            updated.push(options)
            return {}
          },
        },
      },
    } as unknown as Octokit,
    created,
    updated,
  }
}

describe('upsert', () => {
  test('security: updates only the marked comment by the exact App author', async () => {
    const instance = client([
      { body: comment.marker, id: 1, user: { login: 'contributor' } },
      { body: comment.marker, id: 2, user: { login: 'frog-fm[bot]' } },
    ])

    await comment.upsert(instance.client, {
      author: 'frog-fm[bot]',
      body: `Updated.\n\n${comment.marker}`,
      pr: 42,
      repo: 'wevm/frog',
    })

    expect(instance.created).toEqual([])
    expect(instance.updated).toEqual([
      {
        body: `Updated.\n\n${comment.marker}`,
        comment_id: 2,
        owner: 'wevm',
        repo: 'frog',
      },
    ])
  })

  test('security: creates a comment when only another author copied the marker', async () => {
    const instance = client([
      { body: comment.marker, id: 1, user: { login: 'contributor' } },
      { body: comment.marker, id: 2, user: { login: 'Frog-fm[bot]' } },
    ])

    await comment.upsert(instance.client, {
      author: 'frog-fm[bot]',
      body: `Created.\n\n${comment.marker}`,
      pr: 42,
      repo: 'wevm/frog',
    })

    expect(instance.updated).toEqual([])
    expect(instance.created).toEqual([
      {
        body: `Created.\n\n${comment.marker}`,
        issue_number: 42,
        owner: 'wevm',
        repo: 'frog',
      },
    ])
  })
})
