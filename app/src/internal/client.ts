import { Github } from 'frog'
import { type App, Octokit } from 'octokit'

type Authentication = { token: string }

/**
 * Creates a repository-scoped client for pull-request comments.
 *
 * The token requests Pull Requests write without Contents access.
 */
export async function comments(
  app: Pick<App, 'octokit'>,
  options: comments.Options,
): Promise<Octokit> {
  const authentication = (await app.octokit.auth({
    installationId: options.installation,
    permissions: {
      pull_requests: 'write',
    },
    repositoryNames: [Github.split(options.repo).repo],
    type: 'installation',
  })) as Authentication
  return new Octokit({ auth: authentication.token })
}

export declare namespace comments {
  /** Repository installation used for the scoped comment client. */
  type Options = {
    /** GitHub App installation id. */
    installation: number
    /** Repository receiving the comment, as `owner/name`. */
    repo: string
  }
}
