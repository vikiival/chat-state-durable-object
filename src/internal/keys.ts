import { hashString } from './hash.js'

export function normalizeKeyPrefix(prefix: string | undefined): string {
  return prefix?.trim() ? prefix.trim() : 'chat-state'
}

export function shardNameForThread(
  keyPrefix: string,
  threadId: string,
  shardCount: number,
): string {
  return `${keyPrefix}:thread:${hashString(threadId) % shardCount}`
}

export function shardNameForValue(
  keyPrefix: string,
  key: string,
  shardCount: number,
): string {
  return `${keyPrefix}:value:${hashString(key) % shardCount}`
}
