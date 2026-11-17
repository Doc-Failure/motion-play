import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gameAudio } from '../src/audio/GameAudio'
import { CameraSetup, type CameraController } from '../src/camera/CameraSetup'

function camera() {
  const stream = {} as MediaStream
  const source: CameraController = {
    listDevices: vi.fn().mockResolvedValue([]),
    start: vi.fn().mockResolvedValue(stream),
    stop: vi.fn(),
  }
  return { source, stream }
}

describe('retained camera lifecycle', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ setTransform: vi.fn(), clearRect: vi.fn() } as unknown as CanvasRenderingContext2D)
  })
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    ['rocket-rumble', 'Rocket Rumble'], ['ninja-training', 'Paper Dojo'],
    ['bubble-battle', 'Bubble Battle'], ['window-wipe', 'Window Wipe'],
    ['whack-a-mole', 'Whack-a-Mole'],
  ] as const)('disposes %s on route exit while retaining the camera and player count', async (initialGame, title) => {
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const stopAudio = vi.spyOn(gameAudio, 'stop')
    const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame')
    const { source } = camera()
    const { container, rerender, unmount } = render(<CameraSetup readyGateEnabled={false} source={source} initialGame={initialGame} />)
    await waitFor(() => expect(screen.getByRole('button', { name: `Play ${title}` })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: '4 players' }))
    fireEvent.click(screen.getByRole('button', { name: `Play ${title}` }))
    expect(container.querySelector('.camera-play')).not.toBeNull()
    stopAudio.mockClear(); cancelFrame.mockClear()

    rerender(<CameraSetup readyGateEnabled={false} source={source} initialGame={initialGame} active={false} />)
    expect(container.querySelector('.camera-play')).toBeNull()
    expect(stopAudio).toHaveBeenCalled()
    expect(cancelFrame).toHaveBeenCalled()
    expect(source.stop).not.toHaveBeenCalled()

    rerender(<CameraSetup readyGateEnabled={false} source={source} initialGame={initialGame} />)
    expect(screen.getByRole('button', { name: `Play ${title}` })).toBeEnabled()
    expect(screen.getByRole('button', { name: '4 players' })).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelector('.camera-play')).toBeNull()
    expect(source.start).toHaveBeenCalledOnce()
    unmount()
    expect(source.stop).toHaveBeenCalledOnce()
  })

  it('attaches the stream only to the visible video and detaches both outside camera routes', async () => {
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const { source, stream } = camera()
    const { rerender, unmount } = render(<CameraSetup readyGateEnabled={false} source={source} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Play Bubble Battle' })).toBeEnabled())
    const preview = screen.getByLabelText('Mirrored camera preview') as HTMLVideoElement
    expect(preview.srcObject).toBe(stream)
    fireEvent.click(screen.getByRole('button', { name: 'Play Bubble Battle' }))
    const playing = screen.getByLabelText('Mirrored live camera during gameplay') as HTMLVideoElement
    expect(playing.srcObject).toBe(stream)
    expect(preview.srcObject).toBeNull()
    expect(pause.mock.contexts).toContain(preview)

    fireEvent.click(screen.getByRole('button', { name: 'Exit game' }))
    expect(playing.srcObject).toBeNull()
    expect(preview.srcObject).toBe(stream)
    rerender(<CameraSetup readyGateEnabled={false} source={source} active={false} />)
    expect(preview.srcObject).toBeNull()
    expect(source.stop).not.toHaveBeenCalled()
    rerender(<CameraSetup readyGateEnabled={false} source={source} />)
    expect(preview.srcObject).toBe(stream)
    expect(source.start).toHaveBeenCalledOnce()
    unmount()
    expect(preview.srcObject).toBeNull()
    expect(source.stop).toHaveBeenCalledOnce()
  })

  it('keeps a late permission grant detached until a camera route is reopened', async () => {
    const { source, stream } = camera()
    let grant!: (value: MediaStream) => void
    vi.mocked(source.start).mockReturnValue(new Promise(resolve => { grant = resolve }))
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play')
    const { rerender, unmount } = render(<CameraSetup readyGateEnabled={false} source={source} />)
    await waitFor(()=>expect(source.start).toHaveBeenCalledOnce())
    const preview = screen.getByLabelText('Mirrored camera preview') as HTMLVideoElement
    preview.srcObject = null
    play.mockClear()
    rerender(<CameraSetup readyGateEnabled={false} source={source} active={false} />)
    await act(async () => grant(stream))
    expect(preview.srcObject).toBeNull()
    expect(play).not.toHaveBeenCalled()
    expect(source.stop).not.toHaveBeenCalled()

    rerender(<CameraSetup readyGateEnabled={false} source={source} />)
    expect(preview.srcObject).toBe(stream)
    expect(source.start).toHaveBeenCalledOnce()
    unmount()
    expect(source.stop).toHaveBeenCalledOnce()
  })
})
