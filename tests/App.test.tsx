import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const destroy = vi.fn()

vi.mock('../src/game/createGame', () => ({
  createGame: () => ({ destroy }),
}))

import { App } from '../src/app/App'

describe('App', () => {
  it('renders the accessible application scaffold and game host', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Motion Play' })).toBeVisible()
    expect(screen.getByRole('heading', { level: 2, name: 'Game preview' })).toBeVisible()
    expect(screen.getByTestId('game-canvas')).toBeInTheDocument()
  })

  it('destroys the Phaser game when the host unmounts', () => {
    const view = render(<App />)
    view.unmount()

    expect(destroy).toHaveBeenCalledWith(true)
  })
})
