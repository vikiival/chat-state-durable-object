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
    return this.kernel.acquireLock(threadId, ttlMs)
  }

  async cacheDelete(key: string): Promise<void> {
    this.kernel.delete(key)
  }

  async cacheGet(key: string): Promise<string | null> {
    return this.kernel.getValueJson(key)
  }

  async cacheSet(key: string, valueJson: string, ttlMs?: number): Promise<void> {
    this.kernel.set(key, valueJson, ttlMs)
  }

  async cacheSetIfNotExists(
    key: string,
    valueJson: string,
    ttlMs?: number,
  ): Promise<boolean> {
    return this.kernel.setIfNotExists(key, valueJson, ttlMs)
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
  }

  async extendLock(threadId: string, token: string, ttlMs: number): Promise<boolean> {
    return this.kernel.extendLock(threadId, token, ttlMs)
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
}
