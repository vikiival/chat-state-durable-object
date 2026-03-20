import { hashString } from './hash.js'

export function normalizeKeyPrefix(prefix: string | undefined): string {
  return prefix?.trim() ? prefix.trim() : 'chat-state'
}

export function defaultShardName(keyPrefix: string): string {
  return `${keyPrefix}:default`
}

export function shardNameForThread(
  keyPrefix: string,
  threadId: string,
  shardCount: number,
): string {
  if (shardCount <= 1) {
    return defaultShardName(keyPrefix)
  }

  return `${keyPrefix}:thread:${hashString(threadId) % shardCount}`
}

export function shardNameForValue(keyPrefix: string): string {
  return defaultShardName(keyPrefix)
}
