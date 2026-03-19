import type { Lock, StateAdapter } from 'chat'

export interface CloudflareStateRpc {
  acquireLock(threadId: string, ttlMs: number): Lock | null
  cacheDelete(key: string): void
  cacheGet(key: string): string | null
  cacheSet(key: string, valueJson: string, ttlMs?: number): void
  cacheSetIfNotExists(key: string, valueJson: string, ttlMs?: number): boolean
  listAppend(
    key: string,
    valueJson: string,
    options?: {
      maxLength?: number
      ttlMs?: number
    },
  ): void
  extendLock(threadId: string, token: string, ttlMs: number): boolean
  forceReleaseLock(threadId: string): void
  listGet(key: string): string[]
  isSubscribed(threadId: string): boolean
  releaseLock(threadId: string, token: string): void
  subscribe(threadId: string): void
  unsubscribe(threadId: string): void
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
