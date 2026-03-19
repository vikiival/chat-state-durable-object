import type { StateStore, StoredListItem, StoredLock, StoredValue } from '../types.js'

export class InMemoryStateStore implements StateStore {
  private readonly lists = new Map<string, StoredListItem[]>()
  private readonly locks = new Map<string, StoredLock>()
  private readonly subscriptions = new Set<string>()
  private readonly values = new Map<string, StoredValue>()

  deleteLock(threadId: string): void {
    this.locks.delete(threadId)
  }

  deleteValue(key: string): void {
    this.values.delete(key)
  }

  getList(key: string): StoredListItem[] {
    return [...(this.lists.get(key) ?? [])].sort((left, right) => left.order - right.order)
  }

  getLock(threadId: string): StoredLock | null {
    return this.locks.get(threadId) ?? null
  }

  getSubscription(threadId: string): boolean {
    return this.subscriptions.has(threadId)
  }

  getValue(key: string): StoredValue | null {
    return this.values.get(key) ?? null
  }

  replaceList(key: string, items: StoredListItem[]): void {
    this.lists.set(
      key,
      items.map((item) => ({ ...item })),
    )
  }

  setLock(threadId: string, lock: StoredLock): void {
    this.locks.set(threadId, { ...lock })
  }

  setSubscription(threadId: string, subscribed: boolean): void {
    if (subscribed) {
      this.subscriptions.add(threadId)
      return
    }

    this.subscriptions.delete(threadId)
  }

  setValue(key: string, value: StoredValue): void {
    this.values.set(key, { ...value })
  }
}
