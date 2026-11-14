import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraSource, cameraFailure, type CameraDevice, type CameraFailure } from './CameraSource'

export interface CameraController {
  listDevices(): Promise<CameraDevice[]>
  start(deviceId?: string, onEnded?: () => void): Promise<MediaStream>
  stop(): void
}

const failureCopy: Record<CameraFailure, { title: string; help: string }> = {
  'permission-denied': { title: 'Camera permission is blocked', help: 'Allow camera access in your browser’s site settings, then try again.' },
  'not-found': { title: 'No camera was found', help: 'Connect a webcam, check its cable, then try again—or use demo mode.' },
  'in-use': { title: 'Camera is busy', help: 'Close other apps using the camera, then try again.' },
  'unsupported': { title: 'Camera access is unavailable', help: 'Use a current desktop browser on localhost or a secure HTTPS page.' },
  'disconnected': { title: 'Camera disconnected', help: 'Reconnect the camera, choose it again, and retry.' },
  'unknown': { title: 'The camera could not start', help: 'Check the camera connection and browser permission, then try again.' },
}

export function CameraSetup({ source: providedSource }: { source?: CameraController }) {
  const [defaultSource] = useState<CameraController>(() => new CameraSource())
  const source = providedSource ?? defaultSource
  const videoRef = useRef<HTMLVideoElement>(null)
  const [devices, setDevices] = useState<CameraDevice[]>([])
  const [selected, setSelected] = useState('')
  const [status, setStatus] = useState<'idle' | 'requesting' | 'ready' | 'simulation'>('idle')
  const [failure, setFailure] = useState<CameraFailure | null>(null)

  const refreshDevices = useCallback(async () => {
    try {
      const available = await source.listDevices()
      setDevices(available)
      setSelected((current) => available.some((item) => item.deviceId === current) ? current : (available[0]?.deviceId ?? ''))
    } catch { /* Device labels are optional until permission is granted. */ }
  }, [source])

  useEffect(() => {
    void refreshDevices()
    return () => source.stop()
  }, [refreshDevices, source])

  const start = async () => {
    setStatus('requesting')
    setFailure(null)
    try {
      const stream = await source.start(selected || undefined, () => {
        if (videoRef.current) videoRef.current.srcObject = null
        setStatus('idle')
        setFailure('disconnected')
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await Promise.resolve(videoRef.current.play()).catch(() => undefined)
      }
      setStatus('ready')
      await refreshDevices()
    } catch (error) {
      setStatus('idle')
      setFailure(cameraFailure(error))
    }
  }

  const chooseDevice = async (deviceId: string) => {
    setSelected(deviceId)
    if (status === 'ready') {
      source.stop()
      if (videoRef.current) videoRef.current.srcObject = null
      setStatus('idle')
    }
  }

  const simulate = () => {
    source.stop()
    if (videoRef.current) videoRef.current.srcObject = null
    setFailure(null)
    setStatus('simulation')
  }

  return <section className="camera-page" aria-labelledby="camera-title">
    <a className="back-link" href="#/">← Home</a>
    <div className="camera-heading"><p className="eyebrow">Camera setup</p><h1 id="camera-title">Let’s see your moves</h1><p>Your camera stays on this device. Motion Play never uploads or records its picture.</p></div>
    <div className="camera-layout">
      <div className={`camera-preview camera-preview--${status}`}>
        <video ref={videoRef} muted playsInline aria-label="Mirrored camera preview" />
        {status !== 'ready' && <div className="camera-placeholder"><span aria-hidden="true">✦</span><strong>{status === 'simulation' ? 'Demo mode ready' : 'Camera preview'}</strong><small>{status === 'simulation' ? 'No camera is being used.' : 'Your picture will appear here after you choose Start camera.'}</small></div>}
        {status === 'ready' && <span className="camera-live"><i aria-hidden="true" /> Camera on</span>}
      </div>
      <div className="camera-controls">
        <h2>Choose your camera</h2>
        <label htmlFor="camera-device">Camera device</label>
        <select id="camera-device" value={selected} onChange={(event) => void chooseDevice(event.target.value)} disabled={status === 'requesting'}>
          {devices.length === 0 ? <option value="">Default camera</option> : devices.map((device, index) => <option value={device.deviceId} key={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}
        </select>
        <p className="camera-explainer">Your browser will ask for permission only after you press Start camera.</p>
        {failure && <div className="camera-error" role="alert"><strong>{failureCopy[failure].title}</strong><p>{failureCopy[failure].help}</p></div>}
        <div className="camera-actions">
          <button className="crayon-button crayon-button--primary" type="button" onClick={() => void start()} disabled={status === 'requesting'}>{status === 'requesting' ? 'Starting…' : status === 'ready' ? 'Restart camera' : 'Start camera'}</button>
          <button className="text-button" type="button" onClick={simulate}>Use demo mode</button>
        </div>
        <p className="camera-note"><strong>When you leave this screen, the camera turns off.</strong> A real webcam still needs a person to check framing, lighting, and browser behavior.</p>
      </div>
    </div>
  </section>
}
