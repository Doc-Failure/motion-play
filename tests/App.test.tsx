import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { App } from '../src/app/App'

describe('App homepage', () => {
  it('renders the homepage message and local-play privacy promise', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: /ready\. set\. move!/i })).toBeVisible()
    expect(screen.getByText('No accounts. No uploads. Just local play.')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Choose a game' })).toHaveAttribute('href', '#play-menu')
  })

  it('exposes every specified home destination without claiming it is available', () => {
    render(<App />)
    for (const destination of ['Quick Play', 'Game Catalog', 'Tournament', 'Settings']) {
      expect(screen.getByRole('heading', { level: 3, name: destination })).toBeVisible()
    }
    expect(screen.getAllByText('Coming soon')).toHaveLength(4)
  })

  it('keeps decorative artwork out of the accessibility tree', () => {
    const { container } = render(<App />)
    expect(container.querySelector('.hero-art')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('heading', { level: 2, name: 'How do you want to play?' })).toBeVisible()
  })
})
