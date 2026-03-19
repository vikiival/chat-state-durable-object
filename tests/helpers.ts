import type { Lock } from 'chat'

import { CloudflareStateKernel } from '../src/internal/kernel.js'
import { InMemoryStateStore } from '../src/internal/in-memory-store.js'
import type { CloudflareStateRpc } from '../src/types.js'

export class MockCloudflareStateDO implements CloudflareStateRpc {
  private readonly kernel: CloudflareStateKernel

  constructor(private readonly store: InMemoryStateStore = new InMemoryStateStore()) {
    this.kernel = new CloudflareStateKernel(store)
  }

  acquireLock(threadId: string, ttlMs: number): Lock | null {
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

  getStore(): InMemoryStateStore {
    return this.store
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

export function createMockNamespace() {
  const instances = new Map<string, MockCloudflareStateDO>()
  const nameLog: string[] = []

  const namespace = {
    get(id: DurableObjectId) {
      const name = (id as unknown as { name: string }).name
      if (!instances.has(name)) {
        instances.set(name, new MockCloudflareStateDO())
      }

      return instances.get(name) as unknown as DurableObjectStub
    },
    idFromName(name: string) {
      nameLog.push(name)
      return { name } as DurableObjectId
    },
  } as DurableObjectNamespace

  return {
    instances,
    nameLog,
    namespace,
  }
}
