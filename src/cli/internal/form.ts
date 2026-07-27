import fs from 'node:fs/promises'
import path from 'node:path'
import * as Config from '../../Config.js'
import * as Github from '../../Github.js'
import * as IssueForm from '../../IssueForm.js'
import * as Target from '../../Target.js'
import * as octokit from './octokit.js'
import * as target from './target.js'

/**
 * Renders the scaffold an entry aimed at another project should be written against.
 *
 * A project judges a report by its own form. The form is fetched at authoring time, when the answers get
 * written.
 *
 * A token is used when one is around, for the rate limit rather than the access. A public project's
 * issue form reads fine anonymously.
 *
 * @param value - The `--target` as written.
 * @returns The scaffold, or `undefined` when the target resolves to nothing, refuses reports, or has no
 * form frog can be sure of. Every one of those leaves frog's own sections in place.
 */
export async function scaffold(
  value: string,
  options: scaffold.Options,
): Promise<string | undefined> {
  const { env, outbound, root, self } = options

  const token = await octokit.token({ env, ...(options.token ? { token: options.token } : {}) })
  const client = octokit.client({
    ...(token ? { token } : {}),
    ...(env.GITHUB_API_URL ? { baseUrl: env.GITHUB_API_URL } : {}),
  })

  const resolution = await Target.resolve(value, target.resolvers({ client, outbound, root, self }))
  // A refused target is reported by publishing, which says why. Here it only means there is no form to
  // write against.
  if (!resolution.ok || resolution.target.kind === 'self') return undefined

  const { repo, template } = resolution.target
  const form = await IssueForm.find({
    list: (path) => Github.listFiles(client, { path, repo }),
    read: (path) => Github.fetchFile(client, { path, repo }),
    ...(template ? { named: template } : {}),
  })

  return form ? IssueForm.scaffold(form) : undefined
}

export declare namespace scaffold {
  /** Options for {@link scaffold}. */
  type Options = {
    /** Outbound policy from config: whether to report at all, and where. */
    outbound: Config.Outbound
    /** Environment, for the API base URL and the token. */
    env: octokit.token.Options['env'] & { GITHUB_API_URL?: string | undefined }
    /** Repository root, holding `node_modules`. */
    root: string
    /** This repository, as `owner/name`. */
    self: string | undefined
    /** Explicit token, overriding the environment. */
    token?: string | undefined
  }
}

/**
 * Renders the scaffold an entry about this repository should be written against.
 *
 * The same discovery as an upstream target, off disk rather than over the API.
 *
 * @param root - Repository root.
 * @returns The scaffold, or `undefined` when this repository publishes no form.
 */
export async function own(root: string): Promise<string | undefined> {
  const form = await IssueForm.find({
    list: (at) =>
      fs
        .readdir(path.join(root, at))
        .then((names) => names.map((name) => `${at}/${name}`))
        .catch(() => []),
    read: (at) => fs.readFile(path.join(root, at), 'utf8').catch(() => undefined),
  })

  return form ? IssueForm.scaffold(form) : undefined
}
