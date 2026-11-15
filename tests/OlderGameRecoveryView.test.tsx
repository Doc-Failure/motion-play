import { BubbleBattle } from '../src/minigames/bubble-battle/BubbleBattle'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PaintSplash } from '../src/minigames/paint-splash/PaintSplash'
import { MeteorSmash } from '../src/minigames/meteor-smash/MeteorSmash'
import { BalloonPanic } from '../src/minigames/balloon-panic/BalloonPanic'
import { GoldRush } from '../src/minigames/gold-rush/GoldRush'
import { SimonSays } from '../src/minigames/simon-says/SimonSays'
import { FruitCatcher } from '../src/minigames/fruit-catcher/FruitCatcher'
import { AirPong } from '../src/minigames/air-pong/AirPong'
import { Goalkeeper } from '../src/minigames/goalkeeper/Goalkeeper'
import { WindowWipe } from '../src/minigames/window-wipe/WindowWipe'
import { WhackAMole } from '../src/minigames/whack-a-mole/WhackAMole'

const games = [BubbleBattle, PaintSplash, MeteorSmash, BalloonPanic, GoldRush, SimonSays, FruitCatcher, AirPong, Goalkeeper, WindowWipe, WhackAMole]
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

for (const Game of games) describe(`${Game.name} recovery controls`, () => {
  function clock() {
    let frame: FrameRequestCallback | undefined
    const now = vi.spyOn(performance, 'now').mockReturnValue(0)
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => { frame = cb; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    return (time: number) => { now.mockReturnValue(time); act(() => frame?.(time)) }
  }

  for (const time of [1000, 3500]) it(`freezes manual and tab pauses at ${time}ms and restores keyboard focus`, () => {
    const advance = clock()
    const { container } = render(<Game playerCount={4} onExit={vi.fn()} />)
    advance(time)
    const boards = container.querySelector('[class*="-boards"]')!
    const before = boards.innerHTML
    const timeBefore = container.querySelector('dl > div:last-child dd')!.textContent
    const pause = screen.getByRole('button', { name: 'Pause' })
    fireEvent.click(pause)
    expect(screen.getByRole('heading', { name: 'Round paused' })).toHaveFocus()
    const pausedBoard = boards.innerHTML
    advance(20000)
    expect(boards.innerHTML).toBe(pausedBoard)
    expect(container.querySelector('dl > div:last-child dd')).toHaveTextContent(timeBefore!)
    fireEvent.click(screen.getByRole('button', { name: 'Resume round' }))
    expect(pause).toHaveFocus()
    expect(boards.innerHTML).toBe(before)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    // Repeated hidden notifications must not attempt to pause an already paused model.
    fireEvent(document, new Event('visibilitychange'))
    advance(40000)
    expect(screen.getByRole('dialog')).toHaveTextContent('The tab was hidden')
    expect(screen.getByRole('button', { name: 'Resume round' })).toBeDisabled()
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.getByRole('dialog')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Resume round' }))
    advance(41500)
    if (time === 1000) expect(screen.getAllByText('1', { selector: '.game-curtain strong' })).toHaveLength(4)
    else expect(container.querySelector('dl > div:last-child dd')).not.toHaveTextContent(timeBefore!)
  })

  it('keeps replay blocked during camera failure and preserves countdown until explicit resume', () => {
    const advance = clock()
    const props = { playerCount: 1 as const, onExit: vi.fn(), onReconnect: vi.fn() }
    const { rerender } = render(<Game {...props} />)
    advance(65000)
    expect(screen.getByRole('dialog')).toHaveTextContent(/Play again|Paint again|Wipe again/)
    rerender(<Game {...props} externalPauseReason="Camera unavailable" />)
    fireEvent.click(screen.getByRole('button', { name: /Play again|Paint again|Wipe again/ }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Camera unavailable')
    expect(screen.getByRole('button', { name: 'Resume round' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect camera' }))
    expect(props.onReconnect).toHaveBeenCalledOnce()
    advance(90000)
    rerender(<Game {...props} />)
    expect(screen.getByRole('dialog')).toHaveTextContent('Camera recovered. Resume when you are ready.')
    fireEvent.click(screen.getByRole('button', { name: 'Resume round' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('3', { selector: '.game-curtain strong' })).toBeVisible()
  })
})
