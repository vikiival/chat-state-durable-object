import { env } from 'cloudflare:workers'
import { listDurableObjectIds, runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

import { DurableObjectState as AdapterDurableObjectState, createCloudflareState } from '../../src/index.js'
import { defaultShardName, shardNameForThread } from '../../src/internal/keys.js'

type RuntimeDurableObject = AdapterDurableObjectState<Cloudflare.Env>

describe('Durable Object RPC integration', () => {
  it('round-trips state through real Durable Object RPC', async () => {
    const keyPrefix = 'runtime-rpc'
    const threadId = 'telegram:thread:1'
    const state = createCloudflareState({
      keyPrefix,
      namespace: env.CHAT_STATE as unknown as DurableObjectNamespace,
      shardCount: 4,
    })

    await state.connect()

    await state.subscribe(threadId)
    const lock = await state.acquireLock(threadId, 60_000)
    expect(lock).not.toBeNull()
    await state.set('session:1', { hello: 'world' }, 60_000)
    await state.appendToList('history:1', { turn: 1 }, { maxLength: 2, ttlMs: 60_000 })
    await state.appendToList('history:1', { turn: 2 }, { maxLength: 2, ttlMs: 60_000 })

    await expect(state.get('session:1')).resolves.toEqual({ hello: 'world' })
    await expect(state.getList('history:1')).resolves.toEqual([{ turn: 1 }, { turn: 2 }])
    await expect(state.isSubscribed(threadId)).resolves.toBe(true)

    const valueStub = env.CHAT_STATE.get(
      env.CHAT_STATE.idFromName(defaultShardName(keyPrefix)),
    ) as DurableObjectStub<RuntimeDurableObject>
    const storedValue = await runInDurableObject<RuntimeDurableObject, string | null>(
      valueStub,
      async (instance) => await instance.cacheGet('session:1'),
    )
    expect(storedValue).toBe(JSON.stringify({ hello: 'world' }))

    const threadStub = env.CHAT_STATE.get(
      env.CHAT_STATE.idFromName(shardNameForThread(keyPrefix, threadId, 4)),
    ) as DurableObjectStub<RuntimeDurableObject>
    const threadSnapshot = await runInDurableObject<
      RuntimeDurableObject,
      { lockCount: number; subscribed: boolean }
    >(
      threadStub,
      async (instance, state: globalThis.DurableObjectState) => {
        const lockRows = state.storage.sql
          .exec('SELECT token FROM locks WHERE thread_id = ? LIMIT 1', threadId)
          .toArray() as Array<{ token: string }>

        return {
          lockCount: lockRows.length,
          subscribed: await instance.isSubscribed(threadId),
        }
      },
    )
    expect(threadSnapshot).toEqual({
      lockCount: 1,
      subscribed: true,
    })

    const ids = await listDurableObjectIds(env.CHAT_STATE)
    expect(ids.length).toBeGreaterThanOrEqual(2)
  })

  it('cleans expired values, lists, and locks via alarms', async () => {
    const keyPrefix = 'runtime-cleanup'
    const threadId = 'telegram:cleanup:1'
    const state = createCloudflareState({
      keyPrefix,
      namespace: env.CHAT_STATE as unknown as DurableObjectNamespace,
      shardCount: 2,
    })

    await state.connect()

    await state.set('temp:key', { ok: true }, 5)
    await state.appendToList('temp:list', 'value', { ttlMs: 5 })
    expect(await state.acquireLock(threadId, 5)).not.toBeNull()

    await new Promise((resolve) => setTimeout(resolve, 15))

    const valueStub = env.CHAT_STATE.get(
      env.CHAT_STATE.idFromName(defaultShardName(keyPrefix)),
    ) as DurableObjectStub<RuntimeDurableObject>
    const threadStub = env.CHAT_STATE.get(
      env.CHAT_STATE.idFromName(shardNameForThread(keyPrefix, threadId, 2)),
    ) as DurableObjectStub<RuntimeDurableObject>

    await runDurableObjectAlarm(valueStub)
    await runDurableObjectAlarm(threadStub)

    await expect(state.get('temp:key')).resolves.toBeNull()
    await expect(state.getList('temp:list')).resolves.toEqual([])
    await expect(state.acquireLock(threadId, 1000)).resolves.not.toBeNull()
  })
})
