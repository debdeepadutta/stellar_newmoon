import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import wasm from 'vite-plugin-wasm'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    (wasm as any)(),
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util', 'events', 'path', 'os'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  server: {
    proxy: {
      '/prove': {
        target: 'http://127.0.0.1:6300',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    // Exclude WASM-based packages from Vite pre-bundling
    exclude: [
      '@midnight-ntwrk/ledger-v8',
      '@midnight-ntwrk/onchain-runtime-v3',
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/compact-js',
      '@midnight-ntwrk/midnight-js-protocol',
    ],
    // Force pre-bundle CJS packages so Vite adds synthetic default exports
    include: [
      'object-inspect',
      'browser-level',
      'abstract-level',
      'rxjs',
      'buffer',
    ],
    // Use rolldown target for esnext support
    rolldownOptions: {
      output: {
      },
    },
  },
  build: {
    target: 'esnext',
  },
  test: {
    pool: 'threads',
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
})
