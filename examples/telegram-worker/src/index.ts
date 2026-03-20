import { createTelegramAdapter } from '@chat-adapter/telegram'
import { Chat } from 'chat'

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
      adapters: {
        telegram: createTelegramAdapter({
          botToken: env.TELEGRAM_BOT_TOKEN,
          secretToken: env.TELEGRAM_WEBHOOK_SECRET_TOKEN,
          userName: env.TELEGRAM_BOT_USERNAME,
        }),
      },
      state: createCloudflareState({
        namespace: env.CHAT_STATE,
        keyPrefix: 'telegram-worker',
      }),
      userName: env.TELEGRAM_BOT_USERNAME,
    })

    return bot.webhooks.telegram(request)
  },
}
