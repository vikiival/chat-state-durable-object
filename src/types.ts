import type { Lock, StateAdapter } from 'chat'

export interface CloudflareStateRpc {
  acquireLock(threadId: string, ttlMs: number): Promise<Lock | null>
  cacheDelete(key: string): Promise<void>
  cacheGet(key: string): Promise<string | null>
  cacheSet(key: string, valueJson: string, ttlMs?: number): Promise<void>
  cacheSetIfNotExists(key: string, valueJson: string, ttlMs?: number): Promise<boolean>
  listAppend(
    key: string,
    valueJson: string,
    options?: {
      maxLength?: number
      ttlMs?: number
    },
  ): Promise<void>
  extendLock(threadId: string, token: string, ttlMs: number): Promise<boolean>
  forceReleaseLock(threadId: string): Promise<void>
  listGet(key: string): Promise<string[]>
  isSubscribed(threadId: string): Promise<boolean>
  releaseLock(threadId: string, token: string): Promise<void>
  subscribe(threadId: string): Promise<void>
  unsubscribe(threadId: string): Promise<void>
}

export interface CloudflareStateOptions {
  defaultTtlMs?: number
  keyPrefix?: string
  locationHint?: DurableObjectLocationHint
  namespace: DurableObjectNamespace
  shardCount?: number
}

export interface NormalizedCloudflareStateOptions
  extends Omit<CloudflareStateOptions, 'defaultTtlMs' | 'keyPrefix' | 'shardCount'> {
  defaultTtlMs: number | null
  keyPrefix: string
  shardCount: number
}

export interface StoredLock {
  expiresAt: number
  token: string
}

export interface StoredValue {
  expiresAt: number | null
  valueJson: string
}

export interface StoredListItem {
  expiresAt: number | null
  order: number
  valueJson: string
}

export interface StateStore {
  deleteLock(threadId: string): void
  deleteValue(key: string): void
  getList(key: string): StoredListItem[]
  getLock(threadId: string): StoredLock | null
  getSubscription(threadId: string): boolean
  getValue(key: string): StoredValue | null
  replaceList(key: string, items: StoredListItem[]): void
  setLock(threadId: string, lock: StoredLock): void
  setSubscription(threadId: string, subscribed: boolean): void
  setValue(key: string, value: StoredValue): void
}

export type CloudflareStateFactory = (options: CloudflareStateOptions) => StateAdapter
