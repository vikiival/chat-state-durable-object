import type { Lock } from 'chat'

import { CloudflareStateKernel } from '../src/internal/kernel.js'
import { InMemoryStateStore } from '../src/internal/in-memory-store.js'
import type { CloudflareStateRpc } from '../src/types.js'

export class MockCloudflareStateDO implements CloudflareStateRpc {
  private readonly kernel: CloudflareStateKernel

  constructor(private readonly store: InMemoryStateStore = new InMemoryStateStore()) {
    this.kernel = new CloudflareStateKernel(store)
  }

  async acquireLock(threadId: string, ttlMs: number): Promise<Lock | null> {
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

  getStore(): InMemoryStateStore {
    return this.store
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

export function createMockNamespace() {
  const instances = new Map<string, MockCloudflareStateDO>()
  const nameLog: string[] = []

  const namespace = {
    get(id: DurableObjectId) {
      const name = (id as unknown as { name: string }).name
      if (!instances.has(name)) {
        instances.set(name, new MockCloudflareStateDO())
      }

      const instance = instances.get(name) as MockCloudflareStateDO

      return {
        acquireLock: (...args: Parameters<MockCloudflareStateDO['acquireLock']>) =>
          instance.acquireLock(...args),
        cacheDelete: (...args: Parameters<MockCloudflareStateDO['cacheDelete']>) =>
          instance.cacheDelete(...args),
        cacheGet: (...args: Parameters<MockCloudflareStateDO['cacheGet']>) =>
          instance.cacheGet(...args),
        cacheSet: (...args: Parameters<MockCloudflareStateDO['cacheSet']>) =>
          instance.cacheSet(...args),
        cacheSetIfNotExists: (
          ...args: Parameters<MockCloudflareStateDO['cacheSetIfNotExists']>
        ) => instance.cacheSetIfNotExists(...args),
        extendLock: (...args: Parameters<MockCloudflareStateDO['extendLock']>) =>
          instance.extendLock(...args),
        forceReleaseLock: (
          ...args: Parameters<MockCloudflareStateDO['forceReleaseLock']>
        ) => instance.forceReleaseLock(...args),
        isSubscribed: (...args: Parameters<MockCloudflareStateDO['isSubscribed']>) =>
          instance.isSubscribed(...args),
        listAppend: (...args: Parameters<MockCloudflareStateDO['listAppend']>) =>
          instance.listAppend(...args),
        listGet: (...args: Parameters<MockCloudflareStateDO['listGet']>) =>
          instance.listGet(...args),
        releaseLock: (...args: Parameters<MockCloudflareStateDO['releaseLock']>) =>
          instance.releaseLock(...args),
        subscribe: (...args: Parameters<MockCloudflareStateDO['subscribe']>) =>
          instance.subscribe(...args),
        unsubscribe: (...args: Parameters<MockCloudflareStateDO['unsubscribe']>) =>
          instance.unsubscribe(...args),
      } as unknown as DurableObjectStub
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
