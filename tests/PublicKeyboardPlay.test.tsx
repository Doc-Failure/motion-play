import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KeyboardPlayArea } from '../src/game/KeyboardPlayArea'
import { BubbleBattle } from '../src/minigames/bubble-battle/BubbleBattle'
import { WhackAMole } from '../src/minigames/whack-a-mole/WhackAMole'
import { WindowWipe } from '../src/minigames/window-wipe/WindowWipe'

let frame: FrameRequestCallback
let now = 0
const advance = (time: number) => { now = time; act(() => frame(time)) }

beforeEach(() => {
  now = 0
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.spyOn(Math, 'random').mockReturnValue(.5)
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1 }))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('keyboard play area', () => {
  it('announces controls, keeps a bounded cursor and leaves browser shortcuts alone', () => {
    const action = vi.fn()
    render(<KeyboardPlayArea enabled onAction={action} aria-label="My lane" />)
    const board = screen.getByRole('group', { name: 'My lane' })
    expect(board).toHaveAttribute('tabindex', '0')
    expect(board).toHaveAccessibleDescription('Keyboard: arrows to aim. Space or Enter to act.')
    for (let i = 0; i < 30; i++) {
      fireEvent.keyDown(board, { key: 'ArrowRight' })
      fireEvent.keyDown(board, { key: 'ArrowUp' })
    }
    expect(action).not.toHaveBeenCalled()
    fireEvent.keyDown(board, { key: 'Enter' })
    expect(action).toHaveBeenLastCalledWith(1, 0)
    for (let i = 0; i < 30; i++) {
      fireEvent.keyDown(board, { key: 'ArrowLeft' })
      fireEvent.keyDown(board, { key: 'ArrowDown' })
    }
    fireEvent.keyDown(board, { key: ' ' })
    expect(action).toHaveBeenLastCalledWith(0, 1)
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey']) {
      expect(fireEvent.keyDown(board, { key: 'ArrowRight', [modifier]: true })).toBe(true)
      expect(fireEvent.keyDown(board, { key: 'Enter', [modifier]: true })).toBe(true)
    }
    expect(action).toHaveBeenCalledTimes(2)
  })

  it('blocks movement and actions outside play without losing the cursor', () => {
    const action = vi.fn()
    const { rerender } = render(<KeyboardPlayArea enabled onAction={action} aria-label="My lane" />)
    const board = screen.getByRole('group', { name: 'My lane' })
    fireEvent.keyDown(board, { key: 'ArrowLeft' })
    rerender(<KeyboardPlayArea enabled={false} onAction={action} aria-label="My lane" />)
    fireEvent.keyDown(board, { key: 'ArrowLeft' })
    fireEvent.keyDown(board, { key: 'Enter' })
    expect(action).not.toHaveBeenCalled()
    expect(board).toHaveAttribute('aria-disabled', 'true')
    rerender(<KeyboardPlayArea enabled onAction={action} aria-label="My lane" />)
    fireEvent.keyDown(board, { key: 'Enter' })
    expect(action).toHaveBeenCalledWith(.45, .5)
  })
})

for (const [title, Game] of [['Bubble Battle', BubbleBattle], ['Whack-a-Mole', WhackAMole], ['Window Wipe', WindowWipe]] as const) {
  describe(`${title} keyboard fallback`, () => {
    it.each([1, 2, 3, 4] as const)('scores only in the focused lane with %i players and freezes during recovery', playerCount => {
      const { container, rerender } = render(<Game playerCount={playerCount} onExit={vi.fn()} />)
      const board = screen.getByRole('group', { name: `Player ${playerCount} ${title} play area` })
      const scores = () => [...container.querySelectorAll('dl dd')].slice(0, playerCount).map(element => element.textContent)
      const zero = title === 'Window Wipe' ? '0%' : '0'
      fireEvent.keyDown(board, { key: 'Enter' })
      expect(scores()).toEqual(Array(playerCount).fill(zero))
      advance(3000)
      advance(5000)
      board.focus()
      if (title === 'Bubble Battle') for (let i = 0; i < 9; i++) fireEvent.keyDown(board, { key: 'ArrowDown' })
      fireEvent.keyDown(board, { key: 'Enter' })
      expect(scores().slice(0, -1)).toEqual(Array(playerCount - 1).fill(zero))
      expect(scores().at(-1)).not.toBe(zero)
      expect(board).toHaveFocus()
      const before = scores()
      const cursor = board.querySelector('.keyboard-play-cursor')!.getAttribute('style')
      rerender(<Game playerCount={playerCount} onExit={vi.fn()} externalPauseReason="Camera disconnected" />)
      expect(screen.getByRole('heading', { name: 'Round paused' })).toHaveFocus()
      fireEvent.keyDown(board, { key: 'ArrowLeft' })
      fireEvent.keyDown(board, { key: ' ' })
      advance(15000)
      expect(scores()).toEqual(before)
      expect(board.querySelector('.keyboard-play-cursor')).toHaveAttribute('style', cursor)
      expect(screen.getByRole('button', { name: 'Resume round' })).toBeDisabled()
    })

    it('focuses results and returns focus to Pause when replay begins', () => {
      render(<Game playerCount={1} onExit={vi.fn()} />)
      advance(65000)
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByRole('heading')).toHaveFocus()
      fireEvent.click(within(dialog).getByRole('button', { name: /Play again|Wipe again/ }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Pause' })).toHaveFocus()
      expect(screen.getByRole('group', { name: /play area/ })).toHaveAttribute('aria-disabled', 'true')
    })
  })
}
