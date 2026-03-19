import type { Lock } from 'chat'

import { describe, expect, it } from 'vitest'

import { createCloudflareState } from '../../src/index.js'
import { createMockNamespace } from '../helpers.js'

describe('CloudflareStateAdapter contract', () => {
  it('requires connect before use', async () => {
    const mock = createMockNamespace()
    const state = createCloudflareState({
      namespace: mock.namespace,
    })

    await expect(state.subscribe('thread:1')).rejects.toThrow('connect')
  })

  it('handles subscriptions', async () => {
    const mock = createMockNamespace()
    const state = createCloudflareState({
      namespace: mock.namespace,
    })
    await state.connect()

    await state.subscribe('thread:1')
    await expect(state.isSubscribed('thread:1')).resolves.toBe(true)
    await state.unsubscribe('thread:1')
    await expect(state.isSubscribed('thread:1')).resolves.toBe(false)
  })

  it('handles lock acquisition, extension, release, and force release', async () => {
    const mock = createMockNamespace()
    const state = createCloudflareState({
      namespace: mock.namespace,
    })
    await state.connect()

    const lock = await state.acquireLock('thread:1', 5000)
    expect(lock).not.toBeNull()
    await expect(state.acquireLock('thread:1', 5000)).resolves.toBeNull()
    await expect(state.extendLock(lock as Lock, 5000)).resolves.toBe(true)
    await state.forceReleaseLock('thread:1')
    await expect(state.acquireLock('thread:1', 5000)).resolves.not.toBeNull()
    await state.releaseLock(lock as Lock)
  })

  it('handles set, get, delete, and setIfNotExists', async () => {
    const mock = createMockNamespace()
    const state = createCloudflareState({
      namespace: mock.namespace,
    })
    await state.connect()

    await state.set('key:1', { hello: 'world' })
    await expect(state.get('key:1')).resolves.toEqual({ hello: 'world' })
    await expect(state.setIfNotExists('key:1', 'other')).resolves.toBe(false)
    await expect(state.setIfNotExists('key:2', 'value')).resolves.toBe(true)
    await state.delete('key:1')
    await expect(state.get('key:1')).resolves.toBeNull()
  })

  it('handles appendToList, trimming, and retrieval order', async () => {
    const mock = createMockNamespace()
    const state = createCloudflareState({
      namespace: mock.namespace,
    })
    await state.connect()

    await state.appendToList('list:1', 'a', { maxLength: 2 })
    await state.appendToList('list:1', 'b', { maxLength: 2 })
    await state.appendToList('list:1', 'c', { maxLength: 2 })

    await expect(state.getList('list:1')).resolves.toEqual(['b', 'c'])
  })

  it('routes thread and value keys through independent shard names', async () => {
    const mock = createMockNamespace()
    const state = createCloudflareState({
      namespace: mock.namespace,
      shardCount: 4,
    })
    await state.connect()

    await state.subscribe('telegram:1')
    await state.set('cache:1', 'value')

    expect(mock.nameLog[0]).toContain('thread:')
    expect(mock.nameLog[1]).toContain('value:')
  })
})
