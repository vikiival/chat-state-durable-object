import { Chat, Message, parseMarkdown } from 'chat'
import { describe, expect, it } from 'vitest'

import { createCloudflareState } from '../../src/index.js'
import { createMockNamespace } from '../helpers.js'

describe('Chat integration', () => {
  it('instantiates a Chat instance with the Cloudflare state adapter', async () => {
    const mock = createMockNamespace()
    const state = createCloudflareState({
      namespace: mock.namespace,
    })

    const adapter = {
      addReaction: async () => undefined,
      channelIdFromThreadId: (threadId: string) => threadId.split(':').slice(0, 2).join(':'),
      decodeThreadId: (threadId: string) => ({ threadId }),
      deleteMessage: async () => undefined,
      editMessage: async (_threadId: string, _messageId: string) => ({ id: 'edited', raw: {} }),
      encodeThreadId: (data: { threadId: string }) => data.threadId,
      fetchMessages: async () => ({ messages: [] }),
      fetchThread: async (threadId: string) => ({ id: threadId, isDM: true, metadata: {} }),
      handleWebhook: async () => new Response('ok'),
      initialize: async () => undefined,
      name: 'fake',
      parseMessage: (raw: { text: string; threadId: string }) =>
        new Message({
          attachments: [],
          author: {
            fullName: 'User',
            isBot: false,
            isMe: false,
            userId: 'user-1',
            userName: 'user',
          },
          formatted: parseMarkdown(raw.text),
          id: 'msg-1',
          metadata: {
            dateSent: new Date(),
            edited: false,
          },
          raw,
          text: raw.text,
          threadId: raw.threadId,
        }),
      postMessage: async () => ({ id: 'posted', raw: {} }),
      releaseMessage: async () => undefined,
      removeReaction: async () => undefined,
    } as never

    const chat = new Chat({
      adapters: {
        fake: adapter,
      },
      state,
      userName: 'bot',
    })

    await chat.initialize()
    await chat.getState().subscribe('fake:channel:thread')

    await expect(chat.getState().isSubscribed('fake:channel:thread')).resolves.toBe(true)
  })
})
