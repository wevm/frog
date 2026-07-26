import { DurableObject } from 'cloudflare:workers'
import * as state from './internal/coordinatorState.js'

const key = 'state'

/**
 * Durable delivery claims and per-repository mutation leases.
 *
 * Instances are addressed by either a delivery id or repository name. Storage input gates make each
 * read-modify-write transition atomic without holding `blockConcurrencyWhile` across GitHub requests.
 */
export class WebhookCoordinator extends DurableObject<Record<string, never>> {
  async claim(owner: string): Promise<'claimed' | 'completed' | 'processing'> {
    const current = await this.ctx.storage.get<state.State>(key)
    const transition = state.claim(current, { now: Date.now(), owner })
    if (transition.state !== current) await this.ctx.storage.put(key, transition.state)
    return transition.result
  }

  async complete(owner: string): Promise<boolean> {
    const current = await this.ctx.storage.get<state.State>(key)
    const transition = state.complete(current, owner)
    if (transition.state !== current && transition.state)
      await this.ctx.storage.put(key, transition.state)
    if (transition.result && current?.kind === 'delivery' && current.status !== 'completed')
      await this.ctx.storage.setAlarm(Date.now() + state.retention)
    return transition.result
  }

  async abandon(owner: string): Promise<void> {
    const current = await this.ctx.storage.get<state.State>(key)
    const next = state.abandon(current, owner)
    if (next !== current && next === undefined) await this.ctx.storage.delete(key)
  }

  async acquire(owner: string): Promise<boolean> {
    const current = await this.ctx.storage.get<state.State>(key)
    const transition = state.acquire(current, { now: Date.now(), owner })
    if (transition.state !== current) await this.ctx.storage.put(key, transition.state)
    return transition.result
  }

  async release(owner: string): Promise<void> {
    const current = await this.ctx.storage.get<state.State>(key)
    const next = state.release(current, owner)
    if (next !== current && next === undefined) await this.ctx.storage.delete(key)
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.deleteAll()
  }
}
