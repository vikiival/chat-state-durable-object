import type { Lock, StateAdapter } from 'chat'

import { shardNameForThread, shardNameForValue } from './internal/keys.js'
import { deserializeValue, serializeValue } from './internal/serde.js'
import type {
  CloudflareStateOptions,
  CloudflareStateRpc,
  NormalizedCloudflareStateOptions,
} from './types.js'

function normalizeOptions(options: CloudflareStateOptions): NormalizedCloudflareStateOptions {
  if (!options.namespace) {
    throw new Error('Cloudflare state adapter requires a Durable Object namespace binding.')
  }

  return {
    ...options,
    defaultTtlMs: options.defaultTtlMs ?? null,
    keyPrefix: options.keyPrefix?.trim() || 'chat-state',
    shardCount: Math.max(1, options.shardCount ?? 1),
  }
}

export class CloudflareStateAdapter implements StateAdapter {
  private connected = false
  private readonly options: NormalizedCloudflareStateOptions

  constructor(options: CloudflareStateOptions) {
    this.options = normalizeOptions(options)
  }

  async acquireLock(threadId: string, ttlMs: number): Promise<Lock | null> {
    return await this.threadStub(threadId).acquireLock(threadId, ttlMs)
  }

  async appendToList(
    key: string,
    value: unknown,
    options?: {
      maxLength?: number
      ttlMs?: number
    },
  ): Promise<void> {
    this.assertConnected()
    await this.valueStub(key).listAppend(key, serializeValue(value), {
      maxLength: options?.maxLength,
      ttlMs: options?.ttlMs ?? this.options.defaultTtlMs ?? undefined,
    })
  }

  async connect(): Promise<void> {
    this.connected = true
  }

  async delete(key: string): Promise<void> {
    this.assertConnected()
    await this.valueStub(key).cacheDelete(key)
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  async extendLock(lock: Lock, ttlMs: number): Promise<boolean> {
    return await this.threadStub(lock.threadId).extendLock(lock.threadId, lock.token, ttlMs)
  }

  async forceReleaseLock(threadId: string): Promise<void> {
    await this.threadStub(threadId).forceReleaseLock(threadId)
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    this.assertConnected()
    const valueJson = await this.valueStub(key).cacheGet(key)
    return valueJson == null ? null : deserializeValue<T>(valueJson)
  }

  async getList<T = unknown>(key: string): Promise<T[]> {
    this.assertConnected()
    return (await this.valueStub(key).listGet(key)).map((valueJson) => deserializeValue<T>(valueJson))
  }

  async isSubscribed(threadId: string): Promise<boolean> {
    return await this.threadStub(threadId).isSubscribed(threadId)
  }

  async releaseLock(lock: Lock): Promise<void> {
    await this.threadStub(lock.threadId).releaseLock(lock.threadId, lock.token)
  }

  async set<T = unknown>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.assertConnected()
    await this.valueStub(key).cacheSet(
      key,
      serializeValue(value),
      ttlMs ?? this.options.defaultTtlMs ?? undefined,
    )
  }

  async setIfNotExists(key: string, value: unknown, ttlMs?: number): Promise<boolean> {
    this.assertConnected()
    return await this.valueStub(key).cacheSetIfNotExists(
      key,
      serializeValue(value),
      ttlMs ?? this.options.defaultTtlMs ?? undefined,
    )
  }

  async subscribe(threadId: string): Promise<void> {
    await this.threadStub(threadId).subscribe(threadId)
  }

  async unsubscribe(threadId: string): Promise<void> {
    await this.threadStub(threadId).unsubscribe(threadId)
  }

  private assertConnected(): void {
    if (!this.connected) {
      throw new Error('CloudflareStateAdapter is not connected. Call connect() first.')
    }
  }

  private stubByName(name: string): CloudflareStateRpc {
    this.assertConnected()
    const id = this.options.namespace.idFromName(name)

    if (this.options.locationHint) {
      return this.options.namespace.get(id, {
        locationHint: this.options.locationHint,
      }) as unknown as CloudflareStateRpc
    }

    return this.options.namespace.get(id) as unknown as CloudflareStateRpc
  }

  private threadStub(threadId: string): CloudflareStateRpc {
    return this.stubByName(
      shardNameForThread(this.options.keyPrefix, threadId, this.options.shardCount),
    )
  }

  private valueStub(key: string): CloudflareStateRpc {
    return this.stubByName(
      shardNameForValue(this.options.keyPrefix, key, this.options.shardCount),
    )
  }
}
