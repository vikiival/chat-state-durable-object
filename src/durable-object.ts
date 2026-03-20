import { DurableObject } from 'cloudflare:workers'

import { CloudflareStateKernel } from './internal/kernel.js'
import { SqlStateStore } from './internal/sql-store.js'
import type { CloudflareStateRpc } from './types.js'

type CloudflareDurableObjectContext = globalThis.DurableObjectState

export class DurableObjectState<TEnv = unknown>
  extends DurableObject<TEnv>
  implements CloudflareStateRpc {
  private readonly kernel: CloudflareStateKernel
  private readonly store: SqlStateStore

  constructor(ctx: CloudflareDurableObjectContext, env: TEnv) {
    super(ctx, env)
    this.store = new SqlStateStore(ctx.storage.sql)
    this.kernel = new CloudflareStateKernel(this.store)

    ctx.blockConcurrencyWhile(async () => {
      this.store.migrate()
    })
  }

  async acquireLock(threadId: string, ttlMs: number) {
    const result = this.ctx.storage.transactionSync(() => this.kernel.acquireLock(threadId, ttlMs))
    if (result) {
      this.scheduleCleanupIfNeeded()
    }

    return result
  }

  async cacheDelete(key: string): Promise<void> {
    this.kernel.delete(key)
  }

  async cacheGet(key: string): Promise<string | null> {
    return this.kernel.getValueJson(key)
  }

  async cacheSet(key: string, valueJson: string, ttlMs?: number): Promise<void> {
    this.kernel.set(key, valueJson, ttlMs)
    if (ttlMs != null && ttlMs > 0) {
      this.scheduleCleanupIfNeeded()
    }
  }

  async cacheSetIfNotExists(
    key: string,
    valueJson: string,
    ttlMs?: number,
  ): Promise<boolean> {
    const result = this.ctx.storage.transactionSync(() =>
      this.kernel.setIfNotExists(key, valueJson, ttlMs),
    )
    if (result && ttlMs != null && ttlMs > 0) {
      this.scheduleCleanupIfNeeded()
    }

    return result
  }

  async listAppend(
    key: string,
    valueJson: string,
    options?: {
      maxLength?: number
      ttlMs?: number
    },
  ): Promise<void> {
    this.kernel.appendToList(key, valueJson, options)
    if (options?.ttlMs != null && options.ttlMs > 0) {
      this.scheduleCleanupIfNeeded()
    }
  }

  async extendLock(threadId: string, token: string, ttlMs: number): Promise<boolean> {
    const result = this.ctx.storage.transactionSync(() =>
      this.kernel.extendLock(threadId, token, ttlMs),
    )
    if (result) {
      this.scheduleCleanupIfNeeded()
    }

    return result
  }

  async forceReleaseLock(threadId: string): Promise<void> {
    this.kernel.forceReleaseLock(threadId)
  }

  async listGet(key: string): Promise<string[]> {
    return this.kernel.getListValueJsons(key)
  }

  async isSubscribed(threadId: string): Promise<boolean> {
    return this.kernel.isSubscribed(threadId)
  }

  async releaseLock(threadId: string, token: string): Promise<void> {
    this.kernel.releaseLock(threadId, token)
  }

  async subscribe(threadId: string): Promise<void> {
    this.kernel.subscribe(threadId)
  }

  async unsubscribe(threadId: string): Promise<void> {
    this.kernel.unsubscribe(threadId)
  }

  async alarm(): Promise<void> {
    try {
      this.store.deleteExpired(Date.now())

      const next = this.store.nextExpiry(Date.now())
      if (next != null) {
        await this.ctx.storage.setAlarm(next)
      }
    } catch (error) {
      console.error('DurableObjectState: alarm handler failed, rescheduling:', error)
      await this.ctx.storage.setAlarm(Date.now() + 30_000)
    }
  }

  private scheduleCleanupIfNeeded(): void {
    const next = this.store.nextExpiry(Date.now())
    if (next != null) {
      this.ctx.storage.setAlarm(next).catch((error: unknown) => {
        console.error('DurableObjectState: failed to schedule cleanup alarm:', error)
      })
    }
  }
}
