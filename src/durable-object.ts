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

  acquireLock(threadId: string, ttlMs: number) {
    return this.kernel.acquireLock(threadId, ttlMs)
  }

  cacheDelete(key: string): void {
    this.kernel.delete(key)
  }

  cacheGet(key: string): string | null {
    return this.kernel.getValueJson(key)
  }

  cacheSet(key: string, valueJson: string, ttlMs?: number): void {
    this.kernel.set(key, valueJson, ttlMs)
  }

  cacheSetIfNotExists(key: string, valueJson: string, ttlMs?: number): boolean {
    return this.kernel.setIfNotExists(key, valueJson, ttlMs)
  }

  listAppend(
    key: string,
    valueJson: string,
    options?: {
      maxLength?: number
      ttlMs?: number
    },
  ): void {
    this.kernel.appendToList(key, valueJson, options)
  }

  extendLock(threadId: string, token: string, ttlMs: number): boolean {
    return this.kernel.extendLock(threadId, token, ttlMs)
  }

  forceReleaseLock(threadId: string): void {
    this.kernel.forceReleaseLock(threadId)
  }

  listGet(key: string): string[] {
    return this.kernel.getListValueJsons(key)
  }

  isSubscribed(threadId: string): boolean {
    return this.kernel.isSubscribed(threadId)
  }

  releaseLock(threadId: string, token: string): void {
    this.kernel.releaseLock(threadId, token)
  }

  subscribe(threadId: string): void {
    this.kernel.subscribe(threadId)
  }

  unsubscribe(threadId: string): void {
    this.kernel.unsubscribe(threadId)
  }
}
