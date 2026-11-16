import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), {
    name: 'release-privacy-policy',
    apply: 'build',
    transformIndexHtml: () => [{
      tag: 'meta',
      attrs: {
        'http-equiv': 'Content-Security-Policy',
        content: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'none'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'",
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
