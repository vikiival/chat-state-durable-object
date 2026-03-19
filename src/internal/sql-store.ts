import type { StateStore, StoredListItem, StoredLock, StoredValue } from '../types.js'

export class SqlStateStore implements StateStore {
  constructor(private readonly sql: SqlStorage) {}

  migrate(): void {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        thread_id TEXT PRIMARY KEY
      );

      CREATE TABLE IF NOT EXISTS locks (
        thread_id TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS values_store (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        expires_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS list_items (
        list_key TEXT NOT NULL,
        item_order INTEGER NOT NULL,
        value_json TEXT NOT NULL,
        expires_at INTEGER,
        PRIMARY KEY (list_key, item_order)
      );
    `)
  }

  deleteLock(threadId: string): void {
    this.sql.exec('DELETE FROM locks WHERE thread_id = ?', threadId)
  }

  deleteValue(key: string): void {
    this.sql.exec('DELETE FROM values_store WHERE key = ?', key)
  }

  getList(key: string): StoredListItem[] {
    return (this.sql
      .exec(
        `SELECT
          expires_at AS expiresAt,
          item_order AS "order",
          value_json AS valueJson
        FROM list_items
        WHERE list_key = ?
        ORDER BY item_order ASC`,
        key,
      )
      .toArray() as Array<{
      expiresAt: number | null
      order: number
      valueJson: string
    }>)
      .map((row) => ({
        expiresAt: row.expiresAt,
        order: row.order,
        valueJson: row.valueJson,
      }))
  }

  getLock(threadId: string): StoredLock | null {
    const rows = (this.sql
      .exec(
        `SELECT expires_at AS expiresAt, token
        FROM locks
        WHERE thread_id = ?
        LIMIT 1`,
        threadId,
      )
      .toArray() as Array<{
      expiresAt: number
      token: string
    }>)

    return rows[0] ?? null
  }

  getSubscription(threadId: string): boolean {
    return this.sql
      .exec('SELECT 1 FROM subscriptions WHERE thread_id = ? LIMIT 1', threadId)
      .toArray().length > 0
  }

  getValue(key: string): StoredValue | null {
    const rows = (this.sql
      .exec(
        `SELECT expires_at AS expiresAt, value_json AS valueJson
        FROM values_store
        WHERE key = ?
        LIMIT 1`,
        key,
      )
      .toArray() as Array<{
      expiresAt: number | null
      valueJson: string
    }>)

    return rows[0] ?? null
  }

  replaceList(key: string, items: StoredListItem[]): void {
    this.sql.exec('DELETE FROM list_items WHERE list_key = ?', key)
    for (const item of items) {
      this.sql.exec(
        `INSERT INTO list_items (list_key, item_order, value_json, expires_at)
        VALUES (?, ?, ?, ?)`,
        key,
        item.order,
        item.valueJson,
        item.expiresAt,
      )
    }
  }

  setLock(threadId: string, lock: StoredLock): void {
    this.sql.exec(
      `INSERT OR REPLACE INTO locks (thread_id, token, expires_at)
      VALUES (?, ?, ?)`,
      threadId,
      lock.token,
      lock.expiresAt,
    )
  }

  setSubscription(threadId: string, subscribed: boolean): void {
    if (subscribed) {
      this.sql.exec(
        'INSERT OR IGNORE INTO subscriptions (thread_id) VALUES (?)',
        threadId,
      )
      return
    }

    this.sql.exec('DELETE FROM subscriptions WHERE thread_id = ?', threadId)
  }

  setValue(key: string, value: StoredValue): void {
    this.sql.exec(
      `INSERT OR REPLACE INTO values_store (key, value_json, expires_at)
      VALUES (?, ?, ?)`,
      key,
      value.valueJson,
      value.expiresAt,
    )
  }
}
