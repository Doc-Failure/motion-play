export type CameraDevice = Pick<MediaDeviceInfo, 'deviceId' | 'label'>

export type CameraFailure =
  | 'permission-denied'
  | 'not-found'
  | 'in-use'
  | 'unsupported'
  | 'disconnected'
  | 'unknown'

export class CameraRequestCancelledError extends Error {
  constructor() {
    super('Camera request was cancelled.')
    this.name = 'CameraRequestCancelledError'
  }
}

export class CameraSource {
  private stream: MediaStream | null = null
  private endedHandler: (() => void) | null = null
  private requestVersion = 0

  constructor(private readonly devices: MediaDevices | undefined = navigator.mediaDevices) {}

  async listDevices(): Promise<CameraDevice[]> {
    if (!this.devices?.enumerateDevices) return []
    const devices = await this.devices.enumerateDevices()
    return devices
      .filter((device) => device.kind === 'videoinput')
      .map(({ deviceId, label }) => ({ deviceId, label }))
  }

  async start(deviceId?: string, onEnded?: () => void): Promise<MediaStream> {
    if (!this.devices?.getUserMedia) throw Object.assign(new Error('Camera APIs are unavailable.'), { name: 'NotSupportedError' })
    this.stop()
    const requestVersion = this.requestVersion
    const video: MediaTrackConstraints = {
      width: { ideal: 960 },
      height: { ideal: 540 },
      frameRate: { ideal: 24, max: 30 },
      ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }),
    }
    let stream: MediaStream
    try {
      stream = await this.devices.getUserMedia({ video, audio: false })
    } catch (error) {
      if (requestVersion !== this.requestVersion) throw new CameraRequestCancelledError()
      throw error
    }
    // Permission can resolve after unmount, a retry, or switching to demo mode.
    // A superseded request must never leave an unowned camera track running.
    if (requestVersion !== this.requestVersion) {
      stream.getTracks().forEach((item) => item.stop())
      throw new CameraRequestCancelledError()
    }
    const track = stream.getVideoTracks()[0]
    if (!track) {
      stream.getTracks().forEach((item) => item.stop())
      throw Object.assign(new Error('No video track was provided.'), { name: 'NotFoundError' })
    }
    this.stream = stream
    this.endedHandler = () => {
      this.stream = null
      onEnded?.()
    }
    track.addEventListener('ended', this.endedHandler, { once: true })
    return stream
  }

  stop(): void {
    this.requestVersion += 1
    if (!this.stream) return
    const track = this.stream.getVideoTracks()[0]
    if (track && this.endedHandler) track.removeEventListener('ended', this.endedHandler)
    this.stream.getTracks().forEach((item) => item.stop())
    this.stream = null
    this.endedHandler = null
  }
}

export function cameraFailure(error: unknown): CameraFailure {
  const name = error instanceof DOMException || error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'permission-denied'
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'not-found'
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'in-use'
  if (name === 'NotSupportedError') return 'unsupported'
  return 'unknown'
}
