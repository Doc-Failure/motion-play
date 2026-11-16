import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import privacyPolicy from './config/privacy-policy.json'

export default defineConfig({
  plugins: [react(), {
    name: 'release-privacy-policy',
    apply: 'build',
    transformIndexHtml: () => [{
      tag: 'meta',
      attrs: {
        'http-equiv': 'Content-Security-Policy',
        content: privacyPolicy.content,
      },
      injectTo: 'head-prepend',
    }],
  }],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: './tests/setup.ts',
    restoreMocks: true,
  },
})
