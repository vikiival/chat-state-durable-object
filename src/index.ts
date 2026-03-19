import type { StateAdapter } from 'chat'

import { CloudflareStateAdapter } from './adapter.js'
import { DurableObjectState } from './durable-object.js'
import type { CloudflareStateFactory, CloudflareStateOptions } from './types.js'

export const createCloudflareState: CloudflareStateFactory = (
  options: CloudflareStateOptions,
): StateAdapter => {
  return new CloudflareStateAdapter(options)
}

export { CloudflareStateAdapter, DurableObjectState }
export type { CloudflareStateOptions } from './types.js'
