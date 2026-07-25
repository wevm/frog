import http from 'node:http'

/**
 * A real HTTP server implementing the GitHub REST endpoints frictionsets uses.
 *
 * Not a mock: Octokit's `baseUrl` points here and makes genuine requests, so serialization,
 * pagination, and status codes are all exercised. `node:http` rather than a framework keeps this
 * dependency-free.
 */
export type Instance = {
  /** Comments added, keyed by `owner/name#number`. */
  comments: Map<string, string[]>
  /** Issues by `owner/name`, in creation order. */
  issues: Map<string, Issue[]>
  /** Every request received, for asserting call counts. */
  requests: Request[]
  /** Base URL to hand Octokit. */
  url: string
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
  let counter = 0

  for (const [repo, list] of Object.entries(seed)) {
    issues.set(
      repo,
      list.map((issue) => {
        counter += 1
        if (issue.pull) pulls.add(`${repo}#${counter}`)
        return {
          body: issue.body ?? '',
          labels: [...(issue.labels ?? ['friction'])],
          number: counter,
          state: issue.state ?? 'open',
          title: issue.title,
        }
      }),
    )
  }

  const comments = new Map<string, string[]>()
  const requests: Request[] = []

  const server = http.createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? '/', 'http://localhost')
      requests.push({ method: request.method ?? 'GET', path: url.pathname })

      const list = /^\/repos\/([^/]+)\/([^/]+)\/issues$/.exec(url.pathname)
      const comment = /^\/repos\/([^/]+)\/([^/]+)\/issues\/(\d+)\/comments$/.exec(url.pathname)
      const one = /^\/repos\/([^/]+)\/([^/]+)\/issues\/(\d+)$/.exec(url.pathname)
      const repository = /^\/repos\/([^/]+)\/([^/]+)$/.exec(url.pathname)

      const owned = list ?? comment ?? one ?? repository
      const status = owned ? errors[`${owned[1]}/${owned[2]}`] : undefined
      if (status) return json(response, status, { message: 'Not Found' })

      // `repos.get`, for whether this token may label issues here.
      if (repository && request.method === 'GET') {
        const name = `${repository[1]}/${repository[2]}`
        return json(response, 200, {
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
        counter += 1
        const issue: Issue = {
          body: payload.body ?? '',
          // Silently dropped without push access, exactly as GitHub does it.
          labels: pushable(repo) ? (payload.labels ?? []) : [],
          number: counter,
          state: 'open',
          title: payload.title ?? '',
        }
        issues.set(repo, [...(issues.get(repo) ?? []), issue])
        return json(response, 201, issue)
      }

      if (comment && request.method === 'POST') {
        const key = `${comment[1]}/${comment[2]}#${comment[3]}`
        const payload = await readBody<{ body?: string }>(request)
        comments.set(key, [...(comments.get(key) ?? []), payload.body ?? ''])
        return json(response, 201, { id: comments.get(key)?.length ?? 1 })
      }

      return json(response, 404, { message: `Not Found: ${request.method} ${url.pathname}` })
    })()
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  onTestFinished(() => new Promise<void>((resolve) => server.close(() => resolve())))

  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('Server has no port.')

  return { comments, issues, requests, url: `http://127.0.0.1:${address.port}` }
}
