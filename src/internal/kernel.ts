import type { Lock } from 'chat'

import type {
  StateStore,
  StoredListItem,
} from '../types.js'
import { deserializeValue, serializeValue } from './serde.js'
import { computeExpiry, isExpired } from './ttl.js'

export class CloudflareStateKernel {
  constructor(
    private readonly store: StateStore,
    private readonly defaultTtlMs: number | null = null,
    private readonly now: () => number = () => Date.now(),
  ) {}

  acquireLock(threadId: string, ttlMs: number): Lock | null {
    const now = this.now()
    const existing = this.store.getLock(threadId)

    if (existing) {
      if (!isExpired(existing.expiresAt, now)) {
        return null
      }

      this.store.deleteLock(threadId)
    }

    const lock = {
      expiresAt: now + ttlMs,
      threadId,
      token: crypto.randomUUID(),
    }
    this.store.setLock(threadId, lock)
    return lock
  }

  appendToList(
    key: string,
    valueJson: string,
    options?: {
      maxLength?: number
      ttlMs?: number
    },
  ): void {
    const now = this.now()
    const nextExpiry = computeExpiry(options?.ttlMs ?? this.defaultTtlMs, now)
    const current = this.pruneList(key)
    const next = [
      ...current,
      {
        expiresAt: nextExpiry,
        order: current.length,
        valueJson,
      },
    ]
      .map((item, index) => ({
        ...item,
        expiresAt: nextExpiry,
        order: index,
      }))
      .slice(-(options?.maxLength ?? Number.POSITIVE_INFINITY))
      .map((item, index) => ({
        ...item,
        order: index,
      }))

    this.store.replaceList(key, next)
  }

  delete(key: string): void {
    this.store.deleteValue(key)
  }

  extendLock(threadId: string, token: string, ttlMs: number): boolean {
    const now = this.now()
    const existing = this.store.getLock(threadId)

    if (!existing || existing.token !== token || isExpired(existing.expiresAt, now)) {
      return false
    }

    this.store.setLock(threadId, {
      expiresAt: now + ttlMs,
      token,
    })

    return true
  }

  forceReleaseLock(threadId: string): void {
    this.store.deleteLock(threadId)
  }

  get<T>(key: string): T | null {
    const valueJson = this.getValueJson(key)
    return valueJson == null ? null : deserializeValue<T>(valueJson)
  }

  getList<T>(key: string): T[] {
    return this.getListValueJsons(key).map((valueJson) => deserializeValue<T>(valueJson))
  }

  getListValueJsons(key: string): string[] {
    return this.pruneList(key).map((item) => item.valueJson)
  }

  getValueJson(key: string): string | null {
    const now = this.now()
    const existing = this.store.getValue(key)

    if (!existing) {
      return null
    }

    if (isExpired(existing.expiresAt, now)) {
      this.store.deleteValue(key)
      return null
    }

    return existing.valueJson
  }

  isSubscribed(threadId: string): boolean {
    return this.store.getSubscription(threadId)
  }

  releaseLock(threadId: string, token: string): void {
    const existing = this.store.getLock(threadId)
    if (!existing || existing.token !== token) {
      return
    }

    this.store.deleteLock(threadId)
  }

  set(key: string, valueJson: string, ttlMs?: number): void {
    const expiresAt = computeExpiry(ttlMs ?? this.defaultTtlMs, this.now())
    this.store.setValue(key, {
      expiresAt,
      valueJson,
    })
  }

  setIfNotExists(key: string, valueJson: string, ttlMs?: number): boolean {
    const now = this.now()
    const existing = this.store.getValue(key)

    if (existing && !isExpired(existing.expiresAt, now)) {
      return false
    }

    this.set(key, valueJson, ttlMs)
    return true
  }

  subscribe(threadId: string): void {
    this.store.setSubscription(threadId, true)
  }

  unsubscribe(threadId: string): void {
    this.store.setSubscription(threadId, false)
  }

  private pruneList(key: string): StoredListItem[] {
    const now = this.now()
    const items = this.store.getList(key)
    const filtered = items
      .filter((item) => !isExpired(item.expiresAt, now))
      .map((item, index) => ({
        ...item,
        order: index,
      }))

    if (filtered.length !== items.length) {
      this.store.replaceList(key, filtered)
    }

    return filtered
  }
}

export function toStoredJson(value: unknown): string {
  return serializeValue(value)
}
