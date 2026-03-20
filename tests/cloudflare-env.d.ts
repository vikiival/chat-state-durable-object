import type { DurableObjectState } from '../src/index.js'

declare global {
  namespace Cloudflare {
    interface Env {
      CHAT_STATE: DurableObjectNamespace<DurableObjectState>
    }
  }
}

export {}
