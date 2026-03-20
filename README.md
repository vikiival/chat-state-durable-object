# `chat-state-durable-object`

Cloudflare Durable Objects state adapter for [Chat SDK](https://chat-sdk.dev/docs), built as a community package and designed around the full `StateAdapter` contract.

## Why this package exists

The existing community package [`chat-state-cloudflare-do`](https://www.npmjs.com/package/chat-state-cloudflare-do) is a useful starting point, but it currently focuses on subscriptions, locks, and simple cache operations. Chat SDK's `StateAdapter` contract also requires:

- `setIfNotExists`
- `forceReleaseLock`
- `appendToList`
- `getList`

This package implements the complete contract so it can back Chat SDK subscriptions, locking, cache state, and persisted message-history lists without falling back to another store.

## Installation

```bash
pnpm add chat-state-durable-object chat
```

## Usage

```ts
import { Chat } from 'chat'
import { createTelegramAdapter } from '@chat-adapter/telegram'
import { DurableObjectState, createCloudflareState } from 'chat-state-durable-object'

export { DurableObjectState }

interface Env {
  CHAT_STATE: DurableObjectNamespace<DurableObjectState>
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_BOT_USERNAME: string
  TELEGRAM_WEBHOOK_SECRET_TOKEN: string
}

export default {
  async fetch(request: Request, env: Env) {
    const bot = new Chat({
      userName: env.TELEGRAM_BOT_USERNAME,
      adapters: {
        telegram: createTelegramAdapter({
          botToken: env.TELEGRAM_BOT_TOKEN,
          secretToken: env.TELEGRAM_WEBHOOK_SECRET_TOKEN,
          userName: env.TELEGRAM_BOT_USERNAME,
        }),
      },
      state: createCloudflareState({
        namespace: env.CHAT_STATE,
        keyPrefix: 'telegram-bot',
        shardCount: 8,
      }),
    })

    return bot.webhooks.telegram(request)
  },
}
```

## Wrangler configuration

```jsonc
{
  "durable_objects": {
    "bindings": [
      { "name": "CHAT_STATE", "class_name": "DurableObjectState" }
    ]
  },
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["DurableObjectState"] }
  ]
}
```

## API

```ts
createCloudflareState(options): StateAdapter
```

Options:

- `namespace`: `DurableObjectNamespace<DurableObjectState>` required
- `keyPrefix`: optional shard namespace prefix
- `defaultTtlMs`: optional default TTL used by `set`, `setIfNotExists`, and `appendToList`
- `shardCount`: optional shard count, default `1`
- `locationHint`: optional Durable Object location hint

## Design

- Durable Objects are the only backend in v1.
- Thread operations shard by `threadId`.
- Generic key and list operations use the default shard.
- Expiring locks, values, and list items schedule Durable Object alarms for cleanup.
- List appends preserve insertion order and support trimming.
- Tests include both fast contract tests and a real Workers runtime RPC integration test.

## Comparison with `chat-state-cloudflare-do`

Stronger here:

- full `StateAdapter` coverage
- explicit list support for persisted Chat SDK message history
- contract, kernel, Chat integration, and real Workers RPC integration tests

Equivalent:

- Durable Object based persistence
- ESM packaging
- Cloudflare-friendly Worker usage

Weaker for now:

- more internal abstraction than the original package
- no published production benchmark claims yet

## Development

```bash
pnpm install
pnpm run typecheck
pnpm run test
pnpm run build
```

## Example

See [examples/telegram-worker](./examples/telegram-worker) for a minimal consumer project wired to this package.
