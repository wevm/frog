import type { Github } from 'frog'

/** Queue format version. */
const version = 1 as const

/** Maximum encoded body size after reserving Queue's internal metadata overhead. */
export const maxBytes = 127_800

type Installation = { id: number }
type Repository = { full_name: string }

/** The compact, versioned webhook projection persisted in Queue. */
export type Delivery =
  | {
      id: string
      name: 'issues'
      payload: {
        installation: Installation
        issue: { number: number }
        repository: Repository
      }
      v: typeof version
    }
  | {
      id: string
      name: 'pull_request'
      payload: {
        action: 'opened' | 'reopened' | 'synchronize'
        installation: Installation
        number: number
        pull_request: {
          base: { ref: string }
          head: { ref: string; repo: { full_name: string } | null; sha: string }
          user: { login: string } | null
        }
        repository: Repository
      }
      v: typeof version
    }
  | {
      id: string
      name: 'push'
      payload: {
        installation: Installation
        ref: string
        repository: Repository & { default_branch: string }
        sender: { login: string } | null
      }
      v: typeof version
    }

type WithoutVersion<Value> = Value extends { v: typeof version } ? Omit<Value, 'v'> : never

/** Minimal event shape consumed by the registered Octokit handlers. */
export type Event =
  | WithoutVersion<Extract<Delivery, { name: 'pull_request' | 'push' }>>
  | {
      id: string
      name: 'issues'
      payload: {
        action: 'closed' | 'edited'
        installation: Installation
        issue: Github.Issue
        repository: Repository
      }
    }

type ObjectValue = Record<string, unknown>

function object(value: unknown, field: string): ObjectValue {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new InvalidError(`Expected \`${field}\` to be an object.`)
  return value as ObjectValue
}

function string(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0)
    throw new InvalidError(`Expected \`${field}\` to be a non-empty string.`)
  return value
}

function integer(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0)
    throw new InvalidError(`Expected \`${field}\` to be a positive integer.`)
  return value as number
}

function installation(payload: ObjectValue): Installation {
  const value = object(payload['installation'], 'installation')
  return { id: integer(value['id'], 'installation.id') }
}

function repository(payload: ObjectValue): Repository {
  const value = object(payload['repository'], 'repository')
  const fullName = string(value['full_name'], 'repository.full_name')
  if (!/^[\w.-]+\/[\w.-]+$/.test(fullName))
    throw new InvalidError('Expected `repository.full_name` as `owner/name`.')
  return { full_name: fullName }
}

/** Just enough of a repository to name it, or `null` when the fork it lived on is gone. */
function fullName(value: unknown, field: string): { full_name: string } | null {
  if (value === null || value === undefined) return null
  const repo = object(value, field)
  return typeof repo['full_name'] === 'string' && repo['full_name']
    ? { full_name: repo['full_name'] }
    : null
}

function login(value: unknown, field: string): { login: string } | null {
  if (value === null || value === undefined) return null
  const user = object(value, field)
  return typeof user['login'] === 'string' && user['login'] ? { login: user['login'] } : null
}

function action<Action extends string>(
  value: unknown,
  allowed: readonly Action[],
  field: string,
): Action | undefined {
  const name = string(value, field)
  return allowed.find((candidate) => candidate === name)
}

/** Whether an event header names a webhook Frog handles. */
export function supports(name: string): name is Delivery['name'] {
  return name === 'issues' || name === 'pull_request' || name === 'push'
}

/**
 * Validates and projects a signed GitHub payload before it enters Queue.
 *
 * Unsupported actions return `undefined`, matching Octokit's unregistered-event behavior.
 */
export function fromWebhook(options: {
  id: string
  name: Delivery['name']
  payload: unknown
}): Delivery | undefined {
  const id = string(options.id, 'id')
  const payload = object(options.payload, 'payload')
  const installed = installation(payload)
  const repo = repository(payload)

  if (options.name === 'pull_request') {
    const selected = action(
      payload['action'],
      ['opened', 'reopened', 'synchronize'] as const,
      'action',
    )
    if (!selected) return undefined

    const pull = object(payload['pull_request'], 'pull_request')
    const base = object(pull['base'], 'pull_request.base')
    const head = object(pull['head'], 'pull_request.head')
    return {
      id,
      name: options.name,
      payload: {
        action: selected,
        installation: installed,
        number: integer(payload['number'], 'number'),
        pull_request: {
          base: { ref: string(base['ref'], 'pull_request.base.ref') },
          head: {
            ref: string(head['ref'], 'pull_request.head.ref'),
            repo: fullName(head['repo'], 'pull_request.head.repo'),
            sha: string(head['sha'], 'pull_request.head.sha'),
          },
          user: login(pull['user'], 'pull_request.user'),
        },
        repository: repo,
      },
      v: version,
    }
  }

  if (options.name === 'push') {
    const rawRepository = object(payload['repository'], 'repository')
    return {
      id,
      name: options.name,
      payload: {
        installation: installed,
        ref: string(payload['ref'], 'ref'),
        repository: {
          ...repo,
          default_branch: string(rawRepository['default_branch'], 'repository.default_branch'),
        },
        sender: login(payload['sender'], 'sender'),
      },
      v: version,
    }
  }

  const selected = action(payload['action'], ['closed', 'edited', 'reopened'] as const, 'action')
  if (!selected) return undefined
  const issue = object(payload['issue'], 'issue')
  return {
    id,
    name: options.name,
    payload: {
      installation: installed,
      issue: { number: integer(issue['number'], 'issue.number') },
      repository: repo,
    },
    v: version,
  }
}

/** Validates a value read back from Queue, rejecting unknown format versions. */
export function fromQueue(value: unknown): Delivery {
  const delivery = object(value, 'delivery')
  if (delivery['v'] !== version) throw new InvalidError(`Expected queue format version ${version}.`)
  const id = string(delivery['id'], 'id')
  const name = string(delivery['name'], 'name')
  if (!supports(name)) throw new InvalidError('Expected a supported event name.')

  const payload = object(delivery['payload'], 'payload')
  if (name === 'issues') {
    const issue = object(payload['issue'], 'issue')
    return {
      id,
      name,
      payload: {
        installation: installation(payload),
        issue: { number: integer(issue['number'], 'issue.number') },
        repository: repository(payload),
      },
      v: version,
    }
  }

  const normalized = fromWebhook({ id, name, payload })
  if (!normalized) throw new InvalidError('Expected a supported event action.')
  return normalized
}

/** Encoded Queue message size in bytes. */
export function bytes(delivery: Delivery): number {
  return new TextEncoder().encode(JSON.stringify(delivery)).byteLength
}

/**
 * Expands a queued delivery into the minimal event Octokit's handlers consume.
 *
 * Issue events are rehydrated only after the durable delivery claim is acquired. This supplies the
 * current marker for routing; reconciliation refetches again under the origin repository lease.
 */
export async function toEvent(
  delivery: Delivery,
  options: {
    issue: (reference: {
      installation: number
      issue: number
      repo: string
    }) => Promise<Github.Issue>
  },
): Promise<Event> {
  if (delivery.name !== 'issues') {
    const { v: _, ...event } = delivery
    return event
  }

  const issue = await options.issue({
    installation: delivery.payload.installation.id,
    issue: delivery.payload.issue.number,
    repo: delivery.payload.repository.full_name,
  })
  return {
    id: delivery.id,
    name: delivery.name,
    payload: {
      action: issue.state === 'closed' ? 'closed' : 'edited',
      installation: delivery.payload.installation,
      issue,
      repository: delivery.payload.repository,
    },
  }
}

/** A signed or queued delivery does not match Frog's supported projection. */
export class InvalidError extends Error {
  override readonly name = 'Delivery.InvalidError'

  constructor(detail: string) {
    super(`Invalid webhook delivery. ${detail}`)
  }
}
