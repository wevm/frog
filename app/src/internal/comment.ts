import { Github, Store } from 'frictionsets'
import type { Octokit } from 'octokit'

/**
 * Marks the one comment frictionsets keeps on a pull request.
 *
 * An explicit marker rather than matching on the bot's login: the login can be renamed, and a marker
 * also leaves room for a second kind of comment later without the two being confused.
 */
export const marker = '<!-- frictionsets:comment -->'

/** What a pull request run did, as reported back on the pull request. */
export type Report = {
  /** Entries that landed on an issue already covering them. */
  commented: readonly Link[]
  /** Entries filed as new issues. */
  created: readonly Link[]
  /** Entries left pending, and why. */
  deferred: readonly { id: string; reason: string }[]
  /** Entries that already carried an issue link before this run. */
  linked: readonly Link[]
  /** Entries that could not be parsed, and why. */
  malformed: readonly { id: string; reason: string }[]
}

/** An entry and the issue covering it. */
export type Link = {
  /** Entry id. */
  id: string
  /** Issue as `owner/name#number`. */
  issue: string
}

/**
 * Renders the comment body.
 *
 * Pure, so what a contributor reads is snapshot-testable without a webhook.
 *
 * @returns Markdown, or `undefined` when there is nothing worth saying.
 */
export function render(report: Report): string | undefined {
  const { commented, created, deferred, linked, malformed } = report
  const filed = [...created, ...commented]
  if (filed.length === 0 && deferred.length === 0 && malformed.length === 0 && linked.length === 0)
    return undefined

  const lines: string[] = []

  const count = filed.length + linked.length
  lines.push(
    count === 0
      ? '### Friction recorded'
      : `### ${count} friction${count === 1 ? '' : 's'} recorded`,
  )

  if (filed.length > 0) {
    lines.push('', '| Entry | Issue |', '| --- | --- |')
    for (const link of filed) lines.push(`| \`${link.id}\` | ${link.issue} |`)
  }

  if (linked.length > 0) {
    lines.push('', 'Already filed:')
    for (const link of linked) lines.push(`- \`${link.id}\` — ${link.issue}`)
  }

  if (deferred.length > 0) {
    lines.push(
      '',
      `<details><summary>${deferred.length} left pending</summary>`,
      '',
      ...deferred.map((entry) => `- \`${entry.id}\` — ${entry.reason}`),
      '',
      '</details>',
    )
  }

  if (malformed.length > 0) {
    lines.push(
      '',
      `<details><summary>${malformed.length} could not be read</summary>`,
      '',
      ...malformed.map((entry) => `- \`${entry.id}\` — ${entry.reason}`),
      '',
      '</details>',
    )
  }

  lines.push('', `<sub>From \`${Store.dir}\`. Edit an entry and push to update its issue.</sub>`)
  lines.push('', marker)

  return `${lines.join('\n')}\n`
}

/**
 * Posts the comment, or updates the one already there.
 *
 * Updating rather than appending is what keeps a branch that gets pushed twenty times from collecting
 * twenty comments.
 *
 * @param client - Installation client for the repository.
 */
export async function upsert(client: Octokit, options: upsert.Options): Promise<void> {
  const { body, pr, repo } = options
  const { owner, repo: name } = Github.split(repo)

  const existing = await client.paginate(client.rest.issues.listComments, {
    issue_number: pr,
    owner,
    per_page: 100,
    repo: name,
  })
  const mine = existing.find((comment) => comment.body?.includes(marker))

  if (mine) {
    await client.rest.issues.updateComment({ body, comment_id: mine.id, owner, repo: name })
    return
  }
  await client.rest.issues.createComment({ body, issue_number: pr, owner, repo: name })
}

export declare namespace upsert {
  /** Options for {@link upsert}. */
  type Options = {
    /** Comment body, already carrying {@link marker}. */
    body: string
    /** Pull request number. */
    pr: number
    /** Repository holding the pull request, as `owner/name`. */
    repo: string
  }
}
