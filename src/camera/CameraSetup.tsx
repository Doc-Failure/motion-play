import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraSource, cameraFailure, type CameraDevice, type CameraFailure } from './CameraSource'
import {
  constrainCameraZone,
  defaultCameraZones,
  playerViewports,
  type PlayerCameraZone,
  type PlayerCount,
} from '../input/PlayerZoneMapper'
import { MotionProcessor, type MotionFrame, type MotionResult } from '../input/MotionProcessor'
import { SyntheticMotionSimulator } from '../input/SyntheticMotionSimulator'
import { MotionDebugOverlay } from '../input/MotionDebugOverlay'
import { BubbleBattle } from '../minigames/bubble-battle/BubbleBattle'

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
  const captureCanvasRef = useRef<HTMLCanvasElement>(null)
  const processorRef = useRef(new MotionProcessor())
  const simulatorRef = useRef(new SyntheticMotionSimulator())
  const recentFramesRef = useRef<MotionFrame[]>([])
  const [devices, setDevices] = useState<CameraDevice[]>([])
  const [selected, setSelected] = useState('')
  const [status, setStatus] = useState<'idle' | 'requesting' | 'ready' | 'simulation'>('idle')
  const [failure, setFailure] = useState<CameraFailure | null>(null)
  const [playerCount, setPlayerCount] = useState<PlayerCount>(1)
  const [zones, setZones] = useState<PlayerCameraZone[]>(() => defaultCameraZones(1))
  const [sensitivity, setSensitivity] = useState(55)
  const [debug, setDebug] = useState(false)
  const [motion, setMotion] = useState<MotionResult | null>(null)
  const [fps, setFps] = useState(0)
  const [calibration, setCalibration] = useState('Move naturally to test each player zone.')
  const [playing, setPlaying] = useState(false)

  const choosePlayerCount = (count: PlayerCount) => {
    setPlayerCount(count)
    setZones(defaultCameraZones(count))
  }

  const updateZone = (playerId: number, field: 'x' | 'y' | 'width' | 'height', value: number) => {
    setZones((current) => current.map((zone) => zone.playerId === playerId
      ? constrainCameraZone({ ...zone, [field]: value })
      : zone))
  }

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

  useEffect(() => {
    processorRef.current.setSensitivity(sensitivity / 100)
  }, [sensitivity])

  useEffect(() => {
    if (status !== 'ready' && status !== 'simulation') return
    let stopped = false
    let timer = 0
    let frames = 0
    let windowStart = performance.now()
    const processFrame = () => {
      if (stopped) return
      let frame: MotionFrame | null = null
      if (status === 'simulation') frame = simulatorRef.current.next()
      else {
        const video = videoRef.current; const canvas = captureCanvasRef.current
        if (video && canvas && video.videoWidth > 0) {
          canvas.width = 64; canvas.height = 36
          const context = canvas.getContext('2d', { willReadFrequently: true })
          context?.drawImage(video, 0, 0, canvas.width, canvas.height)
          if (context) frame = { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data }
        }
      }
      if (frame) {
        recentFramesRef.current = [...recentFramesRef.current.slice(-11), frame]
        setMotion(processorRef.current.process(frame, zones, performance.now()))
        frames += 1
        const now = performance.now()
        if (now - windowStart >= 500) { setFps(Math.round(frames * 1000 / (now - windowStart))); frames = 0; windowStart = now }
      }
      timer = window.setTimeout(processFrame, 50)
    }
    processorRef.current.reset()
    processFrame()
    return () => { stopped = true; window.clearTimeout(timer) }
  }, [status, zones])

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
    simulatorRef.current.reset()
    setStatus('simulation')
  }

  const recalibrate = () => {
    const frames = recentFramesRef.current
    if (frames.length < 2) { setCalibration('Keep still for a moment, then try recalibrating again.'); return }
    const noise = processorRef.current.calibrate(frames)
    setCalibration(`Calibration ready — background noise ${Math.round(noise)} / 255.`)
  }

  return <>{playing && <BubbleBattle inputEvents={motion?.events ?? []} onExit={() => setPlaying(false)} />}<section className="camera-page" aria-labelledby="camera-title" hidden={playing}>
    <a className="back-link" href="#/">← Home</a>
    <div className="camera-heading"><p className="eyebrow">Camera setup</p><h1 id="camera-title">Let’s see your moves</h1><p>Your camera stays on this device. Motion Play never uploads or records its picture.</p></div>
    <div className="camera-layout">
      <div className={`camera-preview camera-preview--${status}`}>
        <video ref={videoRef} muted playsInline aria-label="Mirrored camera preview" />
        <canvas ref={captureCanvasRef} hidden />
        {status !== 'ready' && <div className="camera-placeholder"><span aria-hidden="true">✦</span><strong>{status === 'simulation' ? 'Demo mode ready' : 'Camera preview'}</strong><small>{status === 'simulation' ? 'No camera is being used.' : 'Your picture will appear here after you choose Start camera.'}</small></div>}
        {status === 'ready' && <span className="camera-live"><i aria-hidden="true" /> Camera on</span>}
        <div className="camera-zones" aria-label="Player camera zones">{zones.map((zone) => <div
          className={`camera-zone camera-zone--${zone.playerId}`}
          data-testid={`camera-zone-${zone.playerId}`}
          key={zone.playerId}
          style={{ left: `${zone.x * 100}%`, top: `${zone.y * 100}%`, width: `${zone.width * 100}%`, height: `${zone.height * 100}%` }}
        ><span>Player {zone.playerId}{(motion?.zones.find((item) => item.playerId === zone.playerId)?.activity ?? 0) > .025 ? ' • moving!' : ''}</span></div>)}</div>
        {debug && <MotionDebugOverlay result={motion} zones={zones} />}
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
        <button className="crayon-button crayon-button--primary" type="button" disabled={(status !== 'ready' && status !== 'simulation') || playerCount !== 1} onClick={() => setPlaying(true)}>Play Bubble Battle</button>
        {playerCount !== 1 && <p className="camera-note">Bubble Battle is validated for one player. Two-player play unlocks in the next milestone.</p>}
      </div>
    </div>
    <section className="motion-calibration" aria-labelledby="motion-title">
      <div><p className="eyebrow">Motion calibration</p><h2 id="motion-title">Wave and watch the scribbles</h2><p>Frame differences measure movement, not hand contact. Stand still while recalibrating so background flicker is ignored.</p></div>
      <div className="motion-controls">
        <label>Sensitivity <strong>{sensitivity}%</strong><input aria-label="Motion sensitivity" type="range" min="0" max="100" value={sensitivity} onChange={(event) => setSensitivity(Number(event.target.value))} /></label>
        <button className="crayon-button" type="button" onClick={recalibrate}>Recalibrate background</button>
        <label className="debug-toggle"><input type="checkbox" checked={debug} onChange={(event) => setDebug(event.target.checked)} /> Show mask debug overlay</label>
        <p role="status">{calibration}</p>
        {debug && <dl className="motion-stats"><div><dt>Threshold</dt><dd>{Math.round(motion?.threshold ?? 0)}</dd></div><div><dt>Processing</dt><dd>{fps} FPS</dd></div><div><dt>Hits</dt><dd>{motion?.events.length ?? 0}</dd></div></dl>}
      </div>
      <div className="motion-meters" aria-label="Player motion levels">{zones.map((zone) => { const activity = motion?.zones.find((item) => item.playerId === zone.playerId)?.activity ?? 0; return <div key={zone.playerId}><span>Player {zone.playerId}</span><meter min="0" max="0.25" value={Math.min(activity, .25)} aria-label={`Player ${zone.playerId} motion level`} /><strong>{activity > .025 ? 'Moving' : 'Still'}</strong></div> })}</div>
    </section>
    <section className="zone-setup" aria-labelledby="zone-title">
      <div className="zone-setup__heading"><div><p className="eyebrow">Player spaces</p><h2 id="zone-title">Give everyone a camera zone</h2></div><p>Camera zones describe where people stand. Game viewports are laid out separately.</p></div>
      <fieldset className="player-count"><legend>Number of players</legend>{([1, 2, 3, 4] as const).map((count) => <button type="button" aria-pressed={playerCount === count} onClick={() => choosePlayerCount(count)} key={count}>{count}<small>{count === 1 ? 'player' : 'players'}</small></button>)}</fieldset>
      <div className="zone-workspace">
        <div className="zone-editors">{zones.map((zone) => <fieldset className={`zone-editor zone-editor--${zone.playerId}`} key={zone.playerId}><legend>Player {zone.playerId} camera zone</legend>{([
          ['x', 'Left'], ['y', 'Top'], ['width', 'Width'], ['height', 'Height'],
        ] as const).map(([field, label]) => <label key={field}>{label}<span>{Math.round(zone[field] * 100)}%</span><input aria-label={`Player ${zone.playerId} ${label}`} type="range" min="0" max="100" step="1" value={Math.round(zone[field] * 100)} onChange={(event) => updateZone(zone.playerId, field, Number(event.target.value) / 100)} /></label>)}</fieldset>)}</div>
        <div className="viewport-card"><h3>Game viewport layout</h3><p>{playerCount === 1 ? 'One full-screen view' : playerCount === 2 ? 'Two side-by-side views' : 'A 2 × 2 grid'} — independent from the camera zones.</p><div className={`viewport-map viewport-map--${playerCount}`} aria-label={`${playerCount} player game viewport layout`}>{playerViewports(playerCount).map((viewport) => <div key={viewport.playerId} style={{ left: `${viewport.x * 100}%`, top: `${viewport.y * 100}%`, width: `${viewport.width * 100}%`, height: `${viewport.height * 100}%` }}>P{viewport.playerId}</div>)}</div></div>
      </div>
    </section>
  </section></>
}
