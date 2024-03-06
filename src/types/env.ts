import type { Env as Env_hono } from 'hono'

export type Env = Env_hono & {
  State?: unknown | undefined
}
