import { createHash } from 'node:crypto'
import { Github } from 'frog'
import type { Octokit } from 'octokit'

/** Marker on the closed issue reserved for repository-owned reconciliation wakeups. */
export const issueMarker = '<!-- frog:reconcile-issue:v1 -->'

/** Marker on the App-owned comment that wakes the repository workflow. */
export const commentMarker = '<!-- frog:reconcile:v1'

const title = 'Frog reconciliation'

function issueBody(): string {
  return [
    'Frog keeps this issue closed and uses one comment on it to request friction-log reconciliation.',
    'The comment is only a wakeup signal; the workflow fetches authenticated state separately.',
    '',
    issueMarker,
    '',
  ].join('\n')
}

function commentBody(delivery: string): string {
  const digest = createHash('sha256').update(delivery).digest('hex')
  return ['Reconcile the friction log.', '', `${commentMarker} delivery=${digest} -->`, ''].join(
    '\n',
  )
}

/**
 * Creates or updates the one App-owned comment that wakes a repository's reconciliation workflow.
 *
 * The issue stays closed so it does not pollute the repository's work queue. Neither its body nor the
 * comment is authoritative input to reconciliation.
 */
export async function wake(client: Octokit, options: wake.Options): Promise<wake.Result> {
  const { author, delivery, repo } = options
  const coordinates = Github.split(repo)

  const issues = await client.paginate(client.rest.issues.listForRepo, {
    ...coordinates,
    creator: author,
    per_page: 100,
    state: 'all',
  })
  let control = issues.find(
    (issue) => issue.user?.login === author && issue.title === title && issue.body === issueBody(),
  )

  if (!control) {
    const created = await client.rest.issues.create({
      ...coordinates,
      body: issueBody(),
      title,
    })
    control = created.data
  }

  if (control.state !== 'closed')
    await client.rest.issues.update({
      ...coordinates,
      issue_number: control.number,
      state: 'closed',
    })

  const comments = await client.paginate(client.rest.issues.listComments, {
    ...coordinates,
    issue_number: control.number,
    per_page: 100,
  })
  const mine = comments.find(
    (comment) => comment.user?.login === author && comment.body?.includes(commentMarker),
  )
  const body = commentBody(delivery)

  if (mine) {
    await client.rest.issues.updateComment({
      ...coordinates,
      body,
      comment_id: mine.id,
    })
    return { comment: mine.id, issue: control.number }
  }

  const created = await client.rest.issues.createComment({
    ...coordinates,
    body,
    issue_number: control.number,
  })
  return { comment: created.data.id, issue: control.number }
}

export declare namespace wake {
  /** Options for {@link wake}. */
  type Options = {
    /** Authenticated GitHub App bot login. */
    author: string
    /** Verified GitHub delivery id, hashed before it reaches the comment. */
    delivery: string
    /** Repository whose workflow should run, as `owner/name`. */
    repo: string
  }

  /** Coordination resources used for the wakeup. */
  type Result = {
    /** App-owned comment id. */
    comment: number
    /** Closed coordination issue number. */
    issue: number
  }
}
