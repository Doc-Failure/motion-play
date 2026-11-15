import { StrictMode } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PinataParty } from '../src/minigames/pinata-party/PinataParty'
import type { MotionInputEvent } from '../src/input/MotionProcessor'

let frame: FrameRequestCallback
let now: number
const props = { playerCount: 2 as const, onExit: vi.fn() }
function tick(time: number) { now = time; act(() => frame(time)) }

describe('Piñata Party rendered simulation', () => {
  beforeEach(() => {
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it.each([1, 2, 3, 4] as const)('renders %i player boards with separate input targets', (playerCount) => {
    render(<PinataParty {...props} playerCount={playerCount} />)
    expect(screen.getAllByRole('button', { name: /Hit Player/ })).toHaveLength(playerCount)
    expect(screen.getByText(`0 / ${playerCount * 50}`)).toBeVisible()
  })

  it('normalizes pointer coordinates within the owning player board', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    render(<PinataParty {...props} />)
    tick(3000)
    const board = screen.getByLabelText('Player 2 Piñata Party play area')
    vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 100, width: 400, height: 200 } as DOMRect)
    fireEvent.pointerDown(board, { clientX: 300, clientY: 190 })
    expect(within(screen.getByRole('region', { name: 'Player 2' })).getByText('1 / 3 hits')).toBeVisible()
    expect(within(screen.getByRole('region', { name: 'Player 1' })).getByText('0 / 3 hits')).toBeVisible()
  })

  it('mounts under the application StrictMode', () => {
    render(<StrictMode><PinataParty {...props} /></StrictMode>)
    expect(screen.getByRole('heading', { name: 'Piñata Party' })).toBeVisible()
  })

  it('shows damage, candy bursts, isolated contributions, respawn, results and replay', () => {
    const { rerender } = render(<PinataParty {...props} />)
    const target = screen.getByRole('button', { name: 'Hit Player 1 piñata' })
    expect(target).toBeDisabled()
    tick(3000)
    for (const timestamp of [3000, 3350, 3700]) {
      now = timestamp
      const event: MotionInputEvent = { playerId: 1, kind: 'MOTION_HIT', x: .5, y: .45, confidence: 1, timestamp }
      rerender(<PinataParty {...props} inputEvents={[event]} />)
    }
    expect(screen.getByText('+10 candy!')).toBeVisible()
    expect(within(screen.getByRole('region', { name: 'Player 1' })).getByText('10 candy')).toBeVisible()
    expect(within(screen.getByRole('region', { name: 'Player 2' })).getByText('0 candy')).toBeVisible()
    expect(target).toBeDisabled()
    tick(4600)
    expect(target).toBeEnabled()
    expect(screen.queryByText('+10 candy!')).not.toBeInTheDocument()
    tick(63000)
    expect(screen.getByRole('dialog', { name: 'Piñata Party results' })).toHaveTextContent('Team candy: 10 / 100')
    expect(screen.getByRole('heading', { name: 'What a candy party!' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(target).toBeDisabled()
    expect(screen.getByText('0 / 100')).toBeVisible()
  })

  it('supports native target buttons and pauses for user, tab visibility and camera recovery', () => {
    const { rerender } = render(<PinataParty {...props} />)
    tick(3000)
    const target = screen.getByRole('button', { name: 'Hit Player 1 piñata' })
    fireEvent.click(target)
    expect(within(screen.getByRole('region', { name: 'Player 1' })).getByText('1 / 3 hits')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    tick(10000)
    expect(screen.getByRole('button', { name: 'Resume' })).toBeEnabled()
    expect(screen.getByText('60s')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    expect(target).toBeEnabled()
    rerender(<PinataParty {...props} externalPauseReason="Camera disconnected" />)
    expect(screen.getByRole('dialog')).toHaveTextContent('Camera disconnected')
    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled()
    rerender(<PinataParty {...props} externalPauseReason={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.getByRole('dialog')).toHaveTextContent('The tab was hidden')
  })
})
