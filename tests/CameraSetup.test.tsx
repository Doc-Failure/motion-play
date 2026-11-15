import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CameraSetup, type CameraController } from '../src/camera/CameraSetup'

function controller(overrides: Partial<CameraController> = {}): CameraController {
  return {
    listDevices: vi.fn().mockResolvedValue([
      { deviceId: 'one', label: 'Desk camera' },
      { deviceId: 'two', label: 'Wide camera' },
    ]),
    start: vi.fn().mockResolvedValue({ getTracks: () => [], getVideoTracks: () => [] } as unknown as MediaStream),
    stop: vi.fn(),
    ...overrides,
  }
}

describe('CameraSetup', () => {
  it('starts a configured tournament with an aggregate scoreboard and first round', () => {
    render(<CameraSetup source={controller()} tournament />)
    fireEvent.click(screen.getByRole('button', { name: '5 rounds Full party' }))
    fireEvent.click(screen.getByRole('button', { name: 'Use demo mode' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start 5-round tournament' }))
    expect(screen.getByRole('heading', { name: 'Wave at the bubbles' })).toBeVisible()
    expect(screen.getByLabelText('Tournament progress')).toHaveTextContent('Round 1 of 5: Bubble Battle')
    expect(screen.getByLabelText('Tournament progress')).toHaveTextContent('P1 0')
  })
  it('launches one-player Bubble Battle from generic simulated motion input', () => {
    render(<CameraSetup source={controller()} />)
    expect(screen.getByRole('button', { name: 'Play Bubble Battle' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Use demo mode' }))
    fireEvent.click(screen.getByRole('button', { name: 'Play Bubble Battle' }))
    expect(screen.getByRole('heading', { name: 'Wave at the bubbles' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Start round now' }))
    expect(screen.getByRole('heading', { name: 'Bubble Battle' })).toBeVisible()
    expect(screen.getByLabelText('Player 1 Bubble Battle play area')).toBeVisible()
    expect(screen.getByText(/move over bubbles for \+10/i)).toBeVisible()
  })
  it('offers a large hands-free menu with native pointer and keyboard buttons', () => {
    render(<CameraSetup source={controller()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Use demo mode' }))
    expect(screen.getByLabelText('Hands-free menu')).toBeVisible()
    const play = screen.getByRole('button', { name: 'Play. Start Bubble Battle' })
    play.focus()
    expect(play).toHaveFocus()
    fireEvent.click(play)
    expect(screen.getByRole('heading', { name: 'Wave at the bubbles' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Start round now' }))
    expect(screen.getByRole('heading', { name: 'Bubble Battle' })).toBeVisible()
  })
  it('launches four independent Bubble Battle viewports', () => {
    render(<CameraSetup source={controller()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Use demo mode' }))
    fireEvent.click(screen.getByRole('button', { name: '4 players' }))
    expect(screen.getByRole('button', { name: 'Play Bubble Battle' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Play Bubble Battle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start round now' }))
    expect(screen.getByText('4-player motion battle')).toBeVisible()
    for (const playerId of [1, 2, 3, 4]) expect(screen.getByLabelText(`Player ${playerId} Bubble Battle play area`)).toBeVisible()
  })
  it('launches Window Wipe through the generic simulated brush input path', () => {
    render(<CameraSetup source={controller()} initialGame="window-wipe" />)
    fireEvent.click(screen.getByRole('button', { name: 'Use demo mode' }))
    expect(screen.getByRole('button', { name: 'Window Wipe' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Play Window Wipe' }))
    expect(screen.getByRole('heading', { name: 'Sweep across the window' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Start round now' }))
    expect(screen.getByRole('heading', { name: 'Window Wipe' })).toBeVisible()
    expect(screen.getByLabelText('Player 1 Window Wipe play area')).toBeVisible()
  })
  it('launches Whack-a-Mole through generic simulated hit input', () => {
    render(<CameraSetup source={controller()} initialGame="whack-a-mole" />)
    fireEvent.click(screen.getByRole('button', { name: 'Use demo mode' }))
    fireEvent.click(screen.getByRole('button', { name: 'Play Whack-a-Mole' }))
    expect(screen.getByRole('heading', { name: 'Whack the popping mole' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Start round now' }))
    expect(screen.getByRole('heading', { name: 'Whack-a-Mole' })).toBeVisible()
    expect(screen.getByLabelText('Player 1 Whack-a-Mole play area')).toBeVisible()
  })
  it('launches Balloon Panic through generic simulated hit input', () => {
    render(<CameraSetup source={controller()} initialGame="balloon-panic" />)
    fireEvent.click(screen.getByRole('button', { name: 'Use demo mode' }))
    fireEvent.click(screen.getByRole('button', { name: 'Play Balloon Panic' }))
    expect(screen.getByRole('heading', { name: 'Match the balloon color' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Start round now' }))
    expect(screen.getByRole('heading', { name: 'Balloon Panic' })).toBeVisible()
    expect(screen.getByLabelText('Player 1 Balloon Panic play area')).toBeVisible()
  })
  it('keeps a mirrored live-camera surface mounted during gameplay', async () => {
    const stream = { getTracks: () => [], getVideoTracks: () => [] } as unknown as MediaStream
    render(<CameraSetup source={controller({ start: vi.fn().mockResolvedValue(stream) })} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))
    await screen.findByText('Camera on')
    fireEvent.click(screen.getByRole('button', { name: 'Play Bubble Battle' }))
    const gameplayVideo = screen.getByLabelText('Mirrored live camera during gameplay') as HTMLVideoElement
    expect(gameplayVideo.srcObject).toBe(stream)
    expect(gameplayVideo.closest('.game-stage')).toHaveClass('game-stage--ready')
  })
  it('pauses a running round on camera disconnect and reconnects without leaving the game', async () => {
    let ended: (() => void) | undefined
    const source = controller({ start: vi.fn(async (_device, onEnded) => {
      ended = onEnded
      return { getTracks: () => [], getVideoTracks: () => [] } as unknown as MediaStream
    }) })
    render(<CameraSetup source={source} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))
    await screen.findByText('Camera on')
    fireEvent.click(screen.getByRole('button', { name: 'Play Bubble Battle' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start round now' }))
    ended?.()
    expect(await screen.findByRole('dialog', { name: 'Hold that pose!' })).toHaveTextContent('camera disconnected')
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect camera' }))
    await waitFor(() => expect(source.start).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Hold that pose!' })).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Bubble Battle' })).toBeVisible()
  })
  it('does not request permission until interaction, selects a device, and mirrors the preview', async () => {
    const source = controller()
    const { container } = render(<CameraSetup source={source} />)
    await screen.findByRole('option', { name: 'Desk camera' })
    expect(source.start).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Camera device'), { target: { value: 'two' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))
    await waitFor(() => expect(source.start).toHaveBeenCalledWith('two', expect.any(Function)))
    expect(screen.getByText('Camera on')).toBeVisible()
    expect(container.querySelector('.camera-preview')).toHaveClass('camera-preview--ready')
    expect(container.querySelector('.camera-preview video')).toBeInTheDocument()
  })

  it('shows permission recovery, supports demo mode, and releases camera on unmount', async () => {
    const source = controller({ start: vi.fn().mockRejectedValue(new DOMException('blocked', 'NotAllowedError')) })
    const { unmount } = render(<CameraSetup source={source} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Allow camera access')
    fireEvent.click(screen.getByRole('button', { name: 'Use demo mode' }))
    expect(screen.getByText('Demo mode ready')).toBeVisible()
    unmount()
    expect(source.stop).toHaveBeenCalled()
  })

  it('reports a disconnected track and offers retry', async () => {
    let ended: (() => void) | undefined
    const source = controller({ start: vi.fn(async (_device, onEnded) => {
      ended = onEnded
      return { getTracks: () => [], getVideoTracks: () => [] } as unknown as MediaStream
    }) })
    render(<CameraSetup source={source} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start camera' }))
    await screen.findByText('Camera on')
    ended?.()
    expect(await screen.findByRole('alert')).toHaveTextContent('Camera disconnected')
    expect(screen.getByRole('button', { name: 'Start camera' })).toBeEnabled()
  })

  it('configures one to four camera zones separately from game viewports', () => {
    render(<CameraSetup source={controller()} />)
    expect(screen.getByRole('button', { name: '1 player' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '4 players' }))
    expect(screen.getAllByText(/Player [1-4] camera zone/)).toHaveLength(4)
    expect(screen.getByLabelText('4 player game viewport layout').children).toHaveLength(4)
    expect(screen.getByTestId('camera-zone-4')).toHaveStyle({ left: '75%', width: '25%' })
    fireEvent.change(screen.getByLabelText('Player 1 Left'), { target: { value: '10' } })
    expect(screen.getByTestId('camera-zone-1')).toHaveStyle({ left: '10%', width: '25%' })
  })

  it('offers sensitivity, calibration, deterministic demo motion, and mask debugging', () => {
    const context = { createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }), putImageData: vi.fn(), strokeRect: vi.fn(), lineWidth: 1, strokeStyle: '' }
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
    const { container } = render(<CameraSetup source={controller()} />)
    expect(screen.getByLabelText('Motion sensitivity')).toHaveValue('55')
    fireEvent.change(screen.getByLabelText('Motion sensitivity'), { target: { value: '70' } })
    expect(screen.getByText('70%')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Recalibrate background' }))
    expect(screen.getByRole('status')).toHaveTextContent('Keep still')
    fireEvent.click(screen.getByRole('button', { name: 'Use demo mode' }))
    fireEvent.click(screen.getByLabelText('Show mask debug overlay'))
    expect(container.querySelector('canvas[aria-label="Motion mask debug overlay"]')).toBeInTheDocument()
    expect(screen.getByText('Threshold')).toBeVisible()
    expect(screen.getByLabelText('Player 1 motion level')).toBeInTheDocument()
    getContext.mockRestore()
  })
})
