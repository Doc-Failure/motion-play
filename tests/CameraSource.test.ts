import { describe, expect, it, vi } from 'vitest'
import { CameraSource, cameraFailure } from '../src/camera/CameraSource'

function makeStream() {
  const track = {
    stop: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as MediaStreamTrack
  const stream = {
    getVideoTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream
  return { stream, track }
}

describe('CameraSource', () => {
  it('treats a superseded permission failure as cancellation while keeping the new stream', async () => {
    const current = makeStream()
    let deny!: (error: Error) => void
    const source = new CameraSource({ getUserMedia: vi.fn()
      .mockImplementationOnce(() => new Promise<MediaStream>((_, reject) => { deny = reject }))
      .mockResolvedValueOnce(current.stream),
    } as unknown as MediaDevices)
    const pending = source.start()
    await source.start()
    deny(new DOMException('Old request denied', 'NotAllowedError'))
    await expect(pending).rejects.toMatchObject({ name: 'CameraRequestCancelledError' })
    expect(current.track.stop).not.toHaveBeenCalled()
    source.stop()
  })

  it('releases a stream when permission resolves after stop', async () => {
    const { stream, track } = makeStream()
    let grant!: (stream: MediaStream) => void
    const source = new CameraSource({ getUserMedia: () => new Promise<MediaStream>((resolve) => { grant = resolve }) } as unknown as MediaDevices)
    const pending = source.start()
    source.stop()
    grant(stream)
    await expect(pending).rejects.toMatchObject({ name: 'CameraRequestCancelledError' })
    expect(track.stop).toHaveBeenCalledOnce()
    expect(track.addEventListener).not.toHaveBeenCalled()
  })

  it('keeps the newest stream when overlapping permission requests resolve out of order', async () => {
    const first = makeStream(), second = makeStream()
    let grant!: (stream: MediaStream) => void
    const source = new CameraSource({ getUserMedia: vi.fn()
      .mockImplementationOnce(() => new Promise<MediaStream>((resolve) => { grant = resolve }))
      .mockResolvedValueOnce(second.stream),
    } as unknown as MediaDevices)
    const pending = source.start()
    await expect(source.start()).resolves.toBe(second.stream)
    grant(first.stream)
    await expect(pending).rejects.toMatchObject({ name: 'CameraRequestCancelledError' })
    expect(first.track.stop).toHaveBeenCalledOnce()
    expect(second.track.stop).not.toHaveBeenCalled()
    source.stop()
    expect(second.track.stop).toHaveBeenCalledOnce()
  })

  it('lists only cameras and starts the selected device without audio', async () => {
    const { stream, track } = makeStream()
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    const enumerateDevices = vi.fn().mockResolvedValue([
      { kind: 'audioinput', deviceId: 'mic', label: 'Mic' },
      { kind: 'videoinput', deviceId: 'front', label: 'Front camera' },
    ])
    const source = new CameraSource({ getUserMedia, enumerateDevices } as unknown as MediaDevices)

    await expect(source.listDevices()).resolves.toEqual([{ deviceId: 'front', label: 'Front camera' }])
    await expect(source.start('front')).resolves.toBe(stream)
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: expect.objectContaining({ deviceId: { exact: 'front' } }),
    })
    expect(track.addEventListener).toHaveBeenCalledWith('ended', expect.any(Function), { once: true })
    source.stop()
    expect(track.stop).toHaveBeenCalledOnce()
  })

  it('stops the previous stream before restarting and maps actionable failures', async () => {
    const first = makeStream()
    const second = makeStream()
    const source = new CameraSource({
      getUserMedia: vi.fn().mockResolvedValueOnce(first.stream).mockResolvedValueOnce(second.stream),
      enumerateDevices: vi.fn(),
    } as unknown as MediaDevices)
    await source.start()
    await source.start()
    expect(first.track.stop).toHaveBeenCalledOnce()
    expect(cameraFailure(new DOMException('blocked', 'NotAllowedError'))).toBe('permission-denied')
    expect(cameraFailure(new DOMException('missing', 'NotFoundError'))).toBe('not-found')
    expect(cameraFailure(new DOMException('busy', 'NotReadableError'))).toBe('in-use')
  })
})
