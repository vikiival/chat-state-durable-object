import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest({
      main: './tests/worker.ts',
      wrangler: {
        configPath: './wrangler.test.jsonc',
      },
    }),
  ],
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
})
