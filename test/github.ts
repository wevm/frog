import { createHash } from 'node:crypto'
import http from 'node:http'

/**
 * A real HTTP server implementing the GitHub REST endpoints frog uses.
 *
 * Not a mock: Octokit's `baseUrl` points here and makes genuine requests, so serialization,
 * pagination, and status codes are all exercised. `node:http` rather than a framework keeps this
 * dependency-free.
 */
export type Instance = {
  /** Comment bodies on an issue, oldest first. */
  comments: (repo: string, issue: number) => readonly string[]
  /** Contents of a branch, for asserting what a commit produced. */
  files: (repo: string, branch?: string) => Record<string, string>
  /** Issues by `owner/name`, in creation order. */
  issues: Map<string, Issue[]>
  /**
   * Lands a pull request on its base and leaves the branch behind, as a squash merge with no branch
   * cleanup does.
   */
  merge: (repo: string, number: number) => void
  /** Commit messages by `owner/name`, newest last. */
  messages: (repo: string, branch?: string) => readonly string[]
  /** Every request received, for asserting call counts. */
  requests: Request[]
  /** Base URL to hand Octokit. */
  url: string
  /** Pull requests opened through the API, in creation order. */
  reviews: (
    repo: string,
  ) => readonly { base: string; head: string; number: number; title: string }[]
  /** Replaces a file on a branch, for asserting what happens once an entry is edited. */
  write: (repo: string, path: string, contents: string, branch?: string) => void
}

export type Issue = {
  body: string
  labels: string[]
  number: number
  state: 'closed' | 'open'
  title: string
}

export type Request = { method: string; path: string }

export type Seed = Record<string, readonly SeedIssue[]>
export type SeedIssue = {
  body?: string | undefined
  labels?: readonly string[] | undefined
  /** Set to mark an entry as a pull request, which `listForRepo` also returns. */
  pull?: boolean | undefined
  state?: 'closed' | 'open' | undefined
  title: string
}

/**
 * Approximates how GitHub tokenizes a title for phrase search: case and punctuation do not matter.
 *
 * Written independently of the normalizer under test, so a mismatch between the two would surface
 * rather than cancel out.
 */
function tokenize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
}

function json(response: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  response.writeHead(status, { 'content-type': 'application/json' })
  response.end(payload)
}

/** Reads a JSON request body. Every shape here is all-optional, so `{}` is a valid empty value. */
async function readBody<value extends object>(request: http.IncomingMessage): Promise<value> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? (JSON.parse(raw) as value) : ({} as value)
}

export type Options = {
  /** Repositories that respond with an error status, keyed by `owner/name`. */
  errors?: Record<string, number> | undefined
  /**
   * Initial branch contents, as `{ 'owner/name': { path: contents } }`.
   *
   * Seeds a commit on `main` so the git data endpoints have a ref to build on.
   */
  files?: Record<string, Record<string, string>> | undefined
  /**
   * Contents of a pull request head, as `{ 'owner/name': { path: contents } }`.
   *
   * Seeded on a `head` branch so a test can express what a pull request changes, which is what separates
   * the entries it introduces from the ones its base branch already carries.
   */
  head?: Record<string, Record<string, string>> | undefined
  /**
   * Repository each npm package declares, served at `/registry/<name>/latest`, keyed by package name.
   *
   * The App has no `node_modules`, so it resolves a package to its repository through the registry.
   */
  packages?: Record<string, string> | undefined
  /** Registry packages that respond with an error status. */
  registryErrors?: Record<string, number> | undefined
  /**
   * Repositories the token has push access to. `undefined` means all of them.
   *
   * GitHub silently drops `labels` on issue creation for a token without push access, which is the
   * normal case when reporting friction upstream. Modelling it is the only way to test that path
   * honestly.
   */
  pushAccess?: readonly string[] | undefined
}

/** Starts the server, stopping it when the test finishes. */
export async function github(seed: Seed = {}, options: Options = {}): Promise<Instance> {
  const errors = options.errors ?? {}
  const pushable = (repo: string) => !options.pushAccess || options.pushAccess.includes(repo)
  const issues = new Map<string, Issue[]>()
  const pulls = new Set<string>()

  // Numbered per repository, as GitHub does. A shared counter would let a test pass for the wrong
  // reason, since `owner/a#1` and `owner/b#1` are different issues.
  const numbers = new Map<string, number>()
  const nextNumber = (repo: string) => {
    const next = (numbers.get(repo) ?? 0) + 1
    numbers.set(repo, next)
    return next
  }

  for (const [repo, list] of Object.entries(seed)) {
    issues.set(
      repo,
      list.map((issue) => {
        const number = nextNumber(repo)
        if (issue.pull) pulls.add(`${repo}#${number}`)
        return {
          body: issue.body ?? '',
          labels: [...(issue.labels ?? ['friction'])],
          number,
          state: issue.state ?? 'open',
          title: issue.title,
        }
      }),
    )
  }

  /** Pull requests opened through the API, for the reconciling one. */
  const reviews: {
    base: string
    head: string
    number: number
    repo: string
    state: 'closed' | 'open'
    title: string
  }[] = []
  const comments: { body: string; id: number; key: string }[] = []
  const requests: Request[] = []

  // Enough of the git object model to assert what a commit produced: blobs by sha, trees as resolved
  // path maps, commits pointing at a tree, and refs pointing at a commit.
  const blobs = new Map<string, string>()
  const trees = new Map<string, Map<string, string>>()
  const commits = new Map<string, { message: string; parent?: string | undefined; tree: string }>()
  const refs = new Map<string, string>()
  let objects = 0
  const nextSha = () => `sha${(objects += 1).toString().padStart(4, '0')}`

  /** Sha of a blob's contents, so rewriting a file with the same bytes changes nothing. */
  const blobSha = (contents: string) =>
    `blob${createHash('sha256').update(contents).digest('hex').slice(0, 8)}`

  /** Sha of a tree's contents, so an unchanged tree keeps its identity. */
  const treeSha = (tree: Map<string, string>) =>
    `tree${createHash('sha256')
      .update(
        [...tree]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([path, blob]) => `${path}\u0000${blob}`)
          .join('\u0001'),
      )
      .digest('hex')
      .slice(0, 8)}`

  for (const [repo, contents] of Object.entries({
    ...Object.fromEntries(Object.keys(options.head ?? {}).map((repo) => [repo, {}])),
    ...options.files,
  })) {
    const tree = new Map<string, string>()
    for (const [path, body] of Object.entries(contents)) {
      const sha = blobSha(body)
      blobs.set(sha, body)
      tree.set(path, sha)
    }
    const initial = treeSha(tree)
    trees.set(initial, tree)
    const commitSha = nextSha()
    commits.set(commitSha, { message: 'initial', tree: initial })
    refs.set(`${repo}#main`, commitSha)
  }

  /** Resolves a branch to its tree, or an empty one. */
  const treeOf = (repo: string, branch: string) => {
    const commit = commits.get(refs.get(`${repo}#${branch}`) ?? '')
    return trees.get(commit?.tree ?? '') ?? new Map<string, string>()
  }

  for (const [repo, contents] of Object.entries(options.head ?? {})) {
    const tree = new Map(treeOf(repo, 'main'))
    for (const [path, body] of Object.entries(contents)) {
      const sha = blobSha(body)
      blobs.set(sha, body)
      tree.set(path, sha)
    }
    const headTree = treeSha(tree)
    trees.set(headTree, tree)
    const commitSha = nextSha()
    commits.set(commitSha, { message: 'head', parent: refs.get(`${repo}#main`), tree: headTree })
    refs.set(`${repo}#head`, commitSha)
  }

  const server = http.createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? '/', 'http://localhost')
      requests.push({ method: request.method ?? 'GET', path: url.pathname })

      const list = /^\/repos\/([^/]+)\/([^/]+)\/issues$/.exec(url.pathname)
      const comment = /^\/repos\/([^/]+)\/([^/]+)\/issues\/(\d+)\/comments$/.exec(url.pathname)
      const one = /^\/repos\/([^/]+)\/([^/]+)\/issues\/(\d+)$/.exec(url.pathname)
      const repository = /^\/repos\/([^/]+)\/([^/]+)$/.exec(url.pathname)
      const contents = /^\/repos\/([^/]+)\/([^/]+)\/contents\/(.*)$/.exec(url.pathname)

      const owned = list ?? comment ?? one ?? repository ?? contents
      const status = owned ? errors[`${owned[1]}/${owned[2]}`] : undefined
      if (status) return json(response, status, { message: 'Not Found' })

      // The npm registry, which the App resolves package names through.
      const registry = /^\/registry\/(.+)\/latest$/.exec(url.pathname)
      if (registry && request.method === 'GET') {
        const name = decodeURIComponent(registry[1] ?? '')
        const status = options.registryErrors?.[name]
        if (status) return json(response, status, { message: 'Registry error' })
        const declared = options.packages?.[name]
        if (declared === undefined) return json(response, 404, { message: 'Not Found' })
        return json(response, 200, { name, repository: `https://github.com/${declared}` })
      }

      // Pull requests, for the reconciling one the App keeps open.
      const pullPaths = /^\/repos\/([^/]+)\/([^/]+)\/pulls$/.exec(url.pathname)
      if (pullPaths) {
        const name = `${pullPaths[1]}/${pullPaths[2]}`
        if (request.method === 'GET') {
          const head = url.searchParams.get('head')
          const wanted = head?.includes(':') ? head.slice(head.indexOf(':') + 1) : head
          return json(
            response,
            200,
            reviews.filter(
              (review) =>
                review.repo === name &&
                review.state === 'open' &&
                (!wanted || review.head === wanted),
            ),
          )
        }
        if (request.method === 'POST') {
          const payload = await readBody<{ base?: string; head?: string; title?: string }>(request)
          const number = nextNumber(name)
          const review = {
            base: payload.base ?? 'main',
            head: payload.head ?? '',
            number,
            repo: name,
            state: 'open' as const,
            title: payload.title ?? '',
          }
          reviews.push(review)
          return json(response, 201, review)
        }
      }

      // `repos.get`, for whether this token may label issues here.
      if (repository && request.method === 'GET') {
        const name = `${repository[1]}/${repository[2]}`
        return json(response, 200, {
          default_branch: 'main',
          full_name: name,
          permissions: { pull: true, push: pushable(name) },
        })
      }

      // `search.issuesAndPullRequests`, the label-independent dedupe path.
      if (url.pathname === '/search/issues' && request.method === 'GET') {
        const q = url.searchParams.get('q') ?? ''
        const name = /repo:(\S+)/.exec(q)?.[1] ?? ''
        const phrase = /"((?:[^"\\]|\\.)*)"/.exec(q)?.[1]?.replace(/\\(.)/g, '$1') ?? ''

        const items = (issues.get(name) ?? [])
          .filter((issue) => tokenize(issue.title) === tokenize(phrase))
          .map((issue) => ({
            ...issue,
            // Search returns pull requests too, same as `listForRepo`.
            ...(pulls.has(`${name}#${issue.number}`) ? { pull_request: { url: '' } } : {}),
          }))
        return json(response, 200, { items, total_count: items.length })
      }

      if (one && request.method === 'GET') {
        const repo = `${one[1]}/${one[2]}`
        const found = (issues.get(repo) ?? []).find((issue) => issue.number === Number(one[3]))
        if (!found) return json(response, 404, { message: 'Not Found' })
        return json(response, 200, found)
      }

      if (one && request.method === 'PATCH') {
        const repo = `${one[1]}/${one[2]}`
        const found = (issues.get(repo) ?? []).find((issue) => issue.number === Number(one[3]))
        if (!found) return json(response, 404, { message: 'Not Found' })
        const payload = await readBody<{ state?: 'closed' | 'open' }>(request)
        if (payload.state) found.state = payload.state
        return json(response, 200, found)
      }

      if (list && request.method === 'GET') {
        const repo = `${list[1]}/${list[2]}`
        const label = url.searchParams.get('labels')
        const state = url.searchParams.get('state') ?? 'open'
        const page = Number(url.searchParams.get('page') ?? '1')
        const perPage = Number(url.searchParams.get('per_page') ?? '30')

        const matching = (issues.get(repo) ?? [])
          .filter((issue) => !label || issue.labels.includes(label))
          .filter((issue) => state === 'all' || issue.state === state)
          .map((issue) => ({
            ...issue,
            ...(pulls.has(`${repo}#${issue.number}`) ? { pull_request: { url: '' } } : {}),
          }))

        return json(response, 200, matching.slice((page - 1) * perPage, page * perPage))
      }

      if (list && request.method === 'POST') {
        const repo = `${list[1]}/${list[2]}`
        const payload = await readBody<{ body?: string; labels?: string[]; title?: string }>(
          request,
        )
        const issue: Issue = {
          body: payload.body ?? '',
          // Silently dropped without push access, exactly as GitHub does it.
          labels: pushable(repo) ? (payload.labels ?? []) : [],
          number: nextNumber(repo),
          state: 'open',
          title: payload.title ?? '',
        }
        issues.set(repo, [...(issues.get(repo) ?? []), issue])
        return json(response, 201, issue)
      }

      if (comment && request.method === 'POST') {
        const key = `${comment[1]}/${comment[2]}#${comment[3]}`
        const payload = await readBody<{ body?: string }>(request)
        const id = comments.length + 1
        comments.push({ body: payload.body ?? '', id, key })
        return json(response, 201, { id })
      }

      if (comment && request.method === 'GET') {
        const key = `${comment[1]}/${comment[2]}#${comment[3]}`
        const listed = comments.filter((entry) => entry.key === key)
        const page = Number(url.searchParams.get('page') ?? '1')
        const perPage = Number(url.searchParams.get('per_page') ?? '30')
        return json(
          response,
          200,
          listed.slice((page - 1) * perPage, page * perPage).map(({ body, id }) => ({ body, id })),
        )
      }

      // `issues.updateComment`, which is how the pull request comment stays a single comment.
      const editComment = /^\/repos\/([^/]+)\/([^/]+)\/issues\/comments\/(\d+)$/.exec(url.pathname)
      if (editComment && request.method === 'PATCH') {
        const payload = await readBody<{ body?: string }>(request)
        const found = comments.find((entry) => entry.id === Number(editComment[3]))
        if (!found) return json(response, 404, { message: 'Not Found' })
        found.body = payload.body ?? ''
        return json(response, 200, { body: found.body, id: found.id })
      }

      // `repos.getContent`, for reading entries and config without cloning.
      if (contents && request.method === 'GET') {
        const name = `${contents[1]}/${contents[2]}`
        const path = decodeURIComponent(contents[3] ?? '')
        const ref = url.searchParams.get('ref') ?? 'main'

        // A ref is either a branch we know or a commit sha.
        const tree = refs.has(`${name}#${ref}`)
          ? treeOf(name, ref)
          : (trees.get(commits.get(ref)?.tree ?? '') ?? treeOf(name, 'main'))

        const blob = tree.get(path)
        if (blob !== undefined)
          return json(response, 200, {
            content: Buffer.from(blobs.get(blob) ?? '', 'utf8').toString('base64'),
            encoding: 'base64',
            path,
            type: 'file',
          })

        // Immediate children only, with nested paths collapsed to the directory holding them, which
        // is what the contents API returns.
        const children = new Map<string, 'dir' | 'file'>()
        for (const entry of tree.keys()) {
          if (!entry.startsWith(`${path}/`)) continue
          const rest = entry.slice(path.length + 1)
          const slash = rest.indexOf('/')
          if (slash === -1) children.set(entry, 'file')
          else children.set(`${path}/${rest.slice(0, slash)}`, 'dir')
        }
        if (children.size === 0) return json(response, 404, { message: 'Not Found' })

        return json(
          response,
          200,
          [...children].map(([entry, type]) => ({
            name: entry.slice(path.length + 1),
            path: entry,
            type,
          })),
        )
      }

      // Git data API: the App's write path, one tree and one commit per reconciliation.
      const git = /^\/repos\/([^/]+)\/([^/]+)\/git\/(.+)$/.exec(url.pathname)
      if (git) {
        const name = `${git[1]}/${git[2]}`
        // Octokit percent-encodes the slash in a ref path param, which real GitHub accepts.
        const rest = decodeURIComponent(git[3] ?? '')

        const readRef = /^ref\/heads\/(.+)$/.exec(rest)
        if (readRef && request.method === 'GET') {
          const sha = refs.get(`${name}#${readRef[1]}`)
          if (!sha) return json(response, 404, { message: 'Not Found' })
          return json(response, 200, {
            object: { sha, type: 'commit' },
            ref: `refs/heads/${readRef[1]}`,
          })
        }

        if (rest === 'refs' && request.method === 'POST') {
          const payload = await readBody<{ ref?: string; sha?: string }>(request)
          const created = /^refs\/heads\/(.+)$/.exec(payload.ref ?? '')
          if (!created?.[1] || !payload.sha)
            return json(response, 422, { message: 'Unprocessable Entity' })
          if (refs.has(`${name}#${created[1]}`))
            return json(response, 422, { message: 'Reference already exists' })
          refs.set(`${name}#${created[1]}`, payload.sha)
          return json(response, 201, {
            object: { sha: payload.sha, type: 'commit' },
            ref: payload.ref,
          })
        }

        const readTree = /^trees\/(.+)$/.exec(rest)
        if (readTree && request.method === 'GET') {
          const tree = trees.get(readTree[1] ?? '')
          if (!tree) return json(response, 404, { message: 'Not Found' })
          return json(response, 200, {
            sha: readTree[1],
            tree: [...tree].map(([path, sha]) => ({ mode: '100644', path, sha, type: 'blob' })),
          })
        }

        const readCommit = /^commits\/(.+)$/.exec(rest)
        if (readCommit && request.method === 'GET') {
          const commit = commits.get(readCommit[1] ?? '')
          if (!commit) return json(response, 404, { message: 'Not Found' })
          return json(response, 200, { sha: readCommit[1], tree: { sha: commit.tree } })
        }

        if (rest === 'blobs' && request.method === 'POST') {
          const payload = await readBody<{ content?: string; encoding?: string }>(request)
          const decoded = Buffer.from(
            payload.content ?? '',
            payload.encoding === 'base64' ? 'base64' : 'utf8',
          ).toString('utf8')
          const sha = blobSha(decoded)
          blobs.set(sha, decoded)
          return json(response, 201, { sha })
        }

        if (rest === 'trees' && request.method === 'POST') {
          const payload = await readBody<{
            base_tree?: string
            tree?: { path?: string; sha?: string | null }[]
          }>(request)
          const base = new Map(trees.get(payload.base_tree ?? '') ?? [])
          for (const entry of payload.tree ?? []) {
            if (!entry.path) continue
            // A null sha against a base tree deletes the path.
            if (entry.sha === null) base.delete(entry.path)
            else if (entry.sha) base.set(entry.path, entry.sha)
          }
          // Content-addressed, as git is: an identical tree gets an identical sha, which is what lets a
          // caller notice a commit would change nothing.
          const sha = treeSha(base)
          trees.set(sha, base)
          return json(response, 201, { sha })
        }

        if (rest === 'commits' && request.method === 'POST') {
          const payload = await readBody<{ message?: string; parents?: string[]; tree?: string }>(
            request,
          )
          const sha = nextSha()
          commits.set(sha, {
            message: payload.message ?? '',
            tree: payload.tree ?? '',
            ...(payload.parents?.[0] ? { parent: payload.parents[0] } : {}),
          })
          return json(response, 201, { sha, tree: { sha: payload.tree } })
        }

        const writeRef = /^refs\/heads\/(.+)$/.exec(rest)
        if (writeRef && request.method === 'PATCH') {
          const payload = await readBody<{ sha?: string }>(request)
          if (payload.sha) refs.set(`${name}#${writeRef[1]}`, payload.sha)
          return json(response, 200, { object: { sha: payload.sha } })
        }
      }

      return json(response, 404, { message: `Not Found: ${request.method} ${url.pathname}` })
    })()
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  onTestFinished(() => new Promise<void>((resolve) => server.close(() => resolve())))

  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('Server has no port.')

  return {
    comments(repo, issue) {
      return comments.filter((entry) => entry.key === `${repo}#${issue}`).map((entry) => entry.body)
    },
    files(repo, branch = 'main') {
      return Object.fromEntries(
        [...treeOf(repo, branch)].map(([path, sha]) => [path, blobs.get(sha) ?? '']),
      )
    },
    issues,
    messages(repo, branch = 'main') {
      const collected: string[] = []
      let sha = refs.get(`${repo}#${branch}`)
      while (sha) {
        const commit = commits.get(sha)
        if (!commit) break
        collected.unshift(commit.message)
        sha = commit.parent
      }
      return collected
    },
    merge(repo, number) {
      const review = reviews.find((entry) => entry.repo === repo && entry.number === number)
      if (!review) return
      review.state = 'closed'

      // The base takes the branch's tree, and the branch ref is left exactly where it was.
      const head = refs.get(`${repo}#${review.head}`)
      const commit = commits.get(head ?? '')
      if (!commit) return
      const sha = nextSha()
      commits.set(sha, {
        message: `Merge pull request #${number}`,
        parent: refs.get(`${repo}#${review.base}`),
        tree: commit.tree,
      })
      refs.set(`${repo}#${review.base}`, sha)
    },
    requests,
    reviews(repo) {
      return reviews
        .filter((review) => review.repo === repo)
        .map(({ base, head, number, title }) => ({ base, head, number, title }))
    },
    url: `http://127.0.0.1:${address.port}`,
    write(repo, path, contents, branch = 'main') {
      const sha = blobSha(contents)
      blobs.set(sha, contents)

      // A new tree and a new commit, rather than an edit in place: trees are shared by content here, so
      // mutating one would silently edit every branch that happens to hold the same tree.
      const tree = new Map(treeOf(repo, branch))
      tree.set(path, sha)
      const treeId = treeSha(tree)
      trees.set(treeId, tree)
      const commit = nextSha()
      commits.set(commit, {
        message: `write ${path}`,
        parent: refs.get(`${repo}#${branch}`),
        tree: treeId,
      })
      refs.set(`${repo}#${branch}`, commit)
    },
  }
}
