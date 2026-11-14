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
})
