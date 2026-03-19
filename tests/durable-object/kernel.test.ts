import { describe, expect, it } from 'vitest'

import { CloudflareStateKernel } from '../../src/internal/kernel.js'
import { InMemoryStateStore } from '../../src/internal/in-memory-store.js'

describe('CloudflareStateKernel durable semantics', () => {
  it('persists subscriptions and values across kernel restarts', () => {
    const store = new InMemoryStateStore()
    const first = new CloudflareStateKernel(store)

    first.subscribe('thread:1')
    first.set('key:1', JSON.stringify({ ok: true }))

    const second = new CloudflareStateKernel(store)

    expect(second.isSubscribed('thread:1')).toBe(true)
    expect(second.get('key:1')).toEqual({ ok: true })
  })

  it('expires values and lists lazily', () => {
    let now = 1000
    const kernel = new CloudflareStateKernel(new InMemoryStateStore(), null, () => now)

    kernel.set('expiring', JSON.stringify('value'), 10)
    kernel.appendToList('list:1', JSON.stringify('a'), { ttlMs: 10 })

    now = 1015

    expect(kernel.get('expiring')).toBeNull()
    expect(kernel.getList('list:1')).toEqual([])
  })

  it('keeps list order after repeated appends and trim', () => {
    const kernel = new CloudflareStateKernel(new InMemoryStateStore())

    kernel.appendToList('list:1', JSON.stringify('a'), { maxLength: 3 })
    kernel.appendToList('list:1', JSON.stringify('b'), { maxLength: 3 })
    kernel.appendToList('list:1', JSON.stringify('c'), { maxLength: 3 })
    kernel.appendToList('list:1', JSON.stringify('d'), { maxLength: 3 })

    expect(kernel.getList<string>('list:1')).toEqual(['b', 'c', 'd'])
  })
})
