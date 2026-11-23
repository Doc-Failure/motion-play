import '@testing-library/jest-dom/vitest'

import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(cleanup)

// jsdom has no media-query API. Use the default display preferences in component tests.
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (media: string) => ({ media, matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
})

Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: vi.fn().mockResolvedValue(undefined),
})
Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: vi.fn(),
})
