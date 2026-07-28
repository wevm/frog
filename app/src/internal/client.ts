import { Github } from 'frog'
import { type App, Octokit } from 'octokit'

type Authentication = { token: string }

/**
 * Creates a client for pull-request comments without merge-capable Pull Requests write access.
 *
 * The token is limited to one repository and GitHub's documented Issues write alternative.
 */
export async function comments(
  app: Pick<App, 'octokit'>,
  options: comments.Options,
): Promise<Octokit> {
  const authentication = (await app.octokit.auth({
    installationId: options.installation,
    permissions: { issues: 'write' },
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
