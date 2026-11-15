import { CarWash } from '../minigames/car-wash/CarWash'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraSource, cameraFailure, type CameraDevice, type CameraFailure } from './CameraSource'
import {
  defaultCameraZones,
  type PlayerCameraZone,
  type PlayerCount,
} from '../input/PlayerZoneMapper'
import { MotionProcessor, type MotionFrame, type MotionResult } from '../input/MotionProcessor'
import { BubbleBattle } from '../minigames/bubble-battle/BubbleBattle'
import { PracticeTutorial } from '../game/PracticeTutorial'
import { WindowWipe } from '../minigames/window-wipe/WindowWipe'
import { WhackAMole } from '../minigames/whack-a-mole/WhackAMole'
import { BalloonPanic } from '../minigames/balloon-panic/BalloonPanic'
import { GoldRush } from '../minigames/gold-rush/GoldRush'
import { PaintSplash } from '../minigames/paint-splash/PaintSplash'
import { SimonSays } from '../minigames/simon-says/SimonSays'
import { FruitCatcher } from '../minigames/fruit-catcher/FruitCatcher'
import { AirPong } from '../minigames/air-pong/AirPong'
import { Goalkeeper } from '../minigames/goalkeeper/Goalkeeper'
import { PinataParty } from '../minigames/pinata-party/PinataParty'
import { TreasureGrab } from '../minigames/treasure-grab/TreasureGrab'
import { StarCollector } from '../minigames/star-collector/StarCollector'
import { SupermarketRush } from '../minigames/supermarket-rush/SupermarketRush'
import { MonsterDefense } from '../minigames/monster-defense/MonsterDefense'
import { MeteorSmash } from '../minigames/meteor-smash/MeteorSmash'
import { TournamentSession } from '../game/TournamentSession'

export type PlayableGame = 'car-wash' | 'treasure-grab' | 'star-collector' | 'supermarket-rush' | 'bubble-battle' | 'window-wipe' | 'whack-a-mole' | 'meteor-smash' | 'monster-defense' | 'pinata-party' | 'balloon-panic' | 'gold-rush' | 'paint-splash' | 'simon-says' | 'fruit-catcher' | 'air-pong' | 'goalkeeper'

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

export function CameraSetup({ source: providedSource, initialGame = 'bubble-battle', tournament = false, active = true }: { source?: CameraController; initialGame?: PlayableGame; tournament?: boolean; active?: boolean }) {
  const [defaultSource] = useState<CameraController>(() => new CameraSource())
  const source = providedSource ?? defaultSource
  const videoRef = useRef<HTMLVideoElement>(null)
  const gameVideoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null)
  const processorRef = useRef(new MotionProcessor())
  const recentFramesRef = useRef<MotionFrame[]>([])
  const lastProcessedFrameRef = useRef(performance.now())
  const [, setDevices] = useState<CameraDevice[]>([])
  const [selected, setSelected] = useState('')
  const [status, setStatus] = useState<'idle' | 'requesting' | 'ready' | 'simulation'>('idle')
  const [failure, setFailure] = useState<CameraFailure | null>(null)
  const [playerCount, setPlayerCount] = useState<PlayerCount>(1)
  const [zones, setZones] = useState<PlayerCameraZone[]>(() => defaultCameraZones(1))
  const sensitivity = 70
  const [motion, setMotion] = useState<MotionResult | null>(null)
  const [, setFps] = useState(0)

  const [flow, setFlow] = useState<'setup' | 'practice' | 'playing' | 'tournament-results'>('setup')
  const [selectedGame, setSelectedGame] = useState<PlayableGame>(initialGame)
  const tournamentLength = 3
  const tournamentSession = useRef<TournamentSession | null>(null)
  const [tournamentSnapshot, setTournamentSnapshot] = useState<ReturnType<TournamentSession['snapshot']> | null>(null)
  const [trackingLost, setTrackingLost] = useState(false)
  const gameActive = flow !== 'setup'
  const beginPractice = useCallback(() => {
    if (tournament && !tournamentSession.current) {
      tournamentSession.current = new TournamentSession(playerCount, tournamentLength)
      setSelectedGame(tournamentSession.current.currentRound!.game)
      setTournamentSnapshot(tournamentSession.current.snapshot())
    }
    setFlow('practice')
  }, [playerCount, tournament, tournamentLength])
  const beginPlaying = useCallback(() => setFlow('playing'), [])
  const returnToSetup = useCallback(() => { tournamentSession.current = null; setTournamentSnapshot(null); setFlow('setup') }, [])
  const finishTournamentRound = useCallback((scores: { playerId: 1 | 2 | 3 | 4; score: number }[]) => {
    const session = tournamentSession.current
    if (!session) return
    const next = session.record(scores)
    setTournamentSnapshot(next)
    if (next.isComplete) setFlow('tournament-results')
    else { setSelectedGame(next.currentRound!.game); setFlow('practice') }
  }, [])

  const choosePlayerCount = (count: PlayerCount) => {
    setPlayerCount(count)
    setZones(defaultCameraZones(count))
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
    if (!gameActive || status !== 'ready' || !gameVideoRef.current || !streamRef.current) return
    gameVideoRef.current.srcObject = streamRef.current
    void Promise.resolve(gameVideoRef.current.play()).catch(() => undefined)
  }, [gameActive, status])

  useEffect(() => {
    if (flow !== 'playing' || status !== 'ready') { setTrackingLost(false); return }
    const timer = window.setInterval(() => setTrackingLost(performance.now() - lastProcessedFrameRef.current >= 3_000), 500)
    return () => window.clearInterval(timer)
  }, [flow, status])

  useEffect(() => {
    if (!active || (status !== 'ready' && status !== 'simulation')) return
    let stopped = false
    let timer = 0
    let frames = 0
    let windowStart = performance.now()
    const processFrame = () => {
      if (stopped) return
      let frame: MotionFrame | null = null
      if (status === 'simulation') frame = null
      else {
        const video = gameActive ? gameVideoRef.current : videoRef.current; const canvas = captureCanvasRef.current
        if (video && canvas && video.videoWidth > 0) {
          canvas.width = 160; canvas.height = 90
          const context = canvas.getContext('2d', { willReadFrequently: true })
          context?.drawImage(video, 0, 0, canvas.width, canvas.height)
          if (context) frame = { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data }
        }
      }
      if (frame) {
        lastProcessedFrameRef.current = performance.now()
        setTrackingLost(false)
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
  }, [status, zones, gameActive, active])

  const start = useCallback(async () => {
    setStatus('requesting')
    setFailure(null)
    try {
      const stream = await source.start(selected || undefined, () => {
        streamRef.current = null
        if (videoRef.current) videoRef.current.srcObject = null
        setStatus('idle')
        setFailure('disconnected')
      })
      streamRef.current = stream
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
  }, [source, selected, refreshDevices])

  useEffect(() => {
    if (active && status === 'idle' && !failure) void start()
  }, [active, status, failure, start])

  useEffect(() => {
    if (active) { setSelectedGame(initialGame); setFlow('setup') }
  }, [active, initialGame, tournament])

  useEffect(() => {
    if (!gameActive && status === 'ready' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      void Promise.resolve(videoRef.current.play()).catch(() => undefined)
    }
  }, [active, gameActive, status])

  const recoveryReason = trackingLost
    ? 'Camera frames stopped for three seconds. Check lighting, framing, or the camera connection.'
    : flow === 'playing' && status === 'requesting' ? 'Reconnecting the camera…'
      : flow === 'playing' && status === 'idle' && failure === 'disconnected' ? 'The camera disconnected. Reconnect it to continue this round.'
        : null
  const selectedTitle = selectedGame === 'car-wash' ? 'Car Wash' : selectedGame === 'treasure-grab' ? 'Treasure Grab' : selectedGame === 'star-collector' ? 'Star Collector' : selectedGame === 'supermarket-rush' ? 'Supermarket Rush' : selectedGame === 'monster-defense' ? 'Monster Defense' : selectedGame === 'window-wipe' ? 'Window Wipe' : selectedGame === 'whack-a-mole' ? 'Whack-a-Mole' : selectedGame === 'pinata-party' ? 'Piñata Party' : selectedGame === 'meteor-smash' ? 'Meteor Smash' : selectedGame === 'balloon-panic' ? 'Balloon Panic' : selectedGame === 'gold-rush' ? 'Gold Rush' : selectedGame === 'paint-splash' ? 'Paint Splash' : selectedGame === 'simon-says' ? 'Simon Says' : selectedGame === 'fruit-catcher' ? 'Fruit Catcher' : selectedGame === 'air-pong' ? 'Air Pong' : selectedGame === 'goalkeeper' ? 'Goalkeeper' : 'Bubble Battle'
  const gameEvents = selectedGame === 'car-wash' || selectedGame === 'window-wipe' || selectedGame === 'paint-splash'
    ? (motion?.positions ?? []).map((event) => ({ ...event, kind: 'MOTION_BRUSH' as const }))
    : selectedGame === 'fruit-catcher' || selectedGame === 'air-pong' ? (motion?.positions ?? []).map((event) => ({ ...event, kind: 'HAND_POSITION' as const }))
      : selectedGame === 'goalkeeper' ? (motion?.positions ?? []).map((event) => ({ ...event, kind: 'BODY_MOVE' as const })) : motion?.events ?? []

  return <>{gameActive && <div className={`game-stage game-stage--${status}`}><video ref={gameVideoRef} className="game-camera" muted playsInline aria-label="Mirrored live camera during gameplay" />{tournament && flow !== 'tournament-results' && tournamentSnapshot && <aside className="tournament-ribbon" aria-label="Tournament progress"><strong>Round {tournamentSnapshot.roundIndex + 1} of {tournamentSnapshot.length}: {tournamentSnapshot.currentRound?.title}</strong><span>{tournamentSnapshot.currentRound?.scoring === 'cooperative' ? 'Team score round' : 'Competitive round'}</span><span>{tournamentSnapshot.totals.map((entry) => `P${entry.playerId} ${entry.score}`).join(' • ')}</span></aside>}{flow === 'tournament-results' ? <div className="tournament-results" role="dialog" aria-label="Tournament results"><p className="eyebrow">Tournament complete</p><h1>Final scoreboard</h1><ol>{tournamentSnapshot?.ranking.map((entry) => <li key={entry.playerId}><strong>Player {entry.playerId}</strong><span>{entry.score} points</span></li>)}</ol>{tournamentSnapshot && tournamentSnapshot.cooperativeTotal > 0 && <p className="team-total">Goalkeeper team score: <strong>{tournamentSnapshot.cooperativeTotal}</strong></p>}<button className="crayon-button crayon-button--primary" type="button" onClick={returnToSetup}>New tournament</button><a className="text-button" href="#/">Home</a></div> : flow === 'practice' ? <PracticeTutorial playerCount={playerCount} game={selectedGame} onStart={beginPlaying} onBack={returnToSetup} /> : selectedGame === 'car-wash' ? <CarWash playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'window-wipe' ? <WindowWipe playerCount={playerCount} inputEvents={gameEvents} onExit={returnToSetup} onComplete={tournament ? finishTournamentRound : undefined} /> : selectedGame === 'paint-splash' ? <PaintSplash playerCount={playerCount} inputEvents={gameEvents} onExit={returnToSetup} onComplete={tournament ? finishTournamentRound : undefined} /> : selectedGame === 'whack-a-mole' ? <WhackAMole playerCount={playerCount} inputEvents={gameEvents} onExit={returnToSetup} onComplete={tournament ? finishTournamentRound : undefined} /> : selectedGame === 'treasure-grab' ? <TreasureGrab playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'star-collector' ? <StarCollector playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'supermarket-rush' ? <SupermarketRush playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'monster-defense' ? <MonsterDefense playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'pinata-party' ? <PinataParty playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'meteor-smash' ? <MeteorSmash playerCount={playerCount} inputEvents={gameEvents} onExit={returnToSetup} /> : selectedGame === 'balloon-panic' ? <BalloonPanic playerCount={playerCount} inputEvents={gameEvents} onExit={returnToSetup} /> : selectedGame === 'gold-rush' ? <GoldRush playerCount={playerCount} inputEvents={gameEvents} onExit={returnToSetup} /> : selectedGame === 'simon-says' ? <SimonSays playerCount={playerCount} inputEvents={gameEvents} onExit={returnToSetup} /> : selectedGame === 'fruit-catcher' ? <FruitCatcher playerCount={playerCount} inputEvents={gameEvents} onExit={returnToSetup} /> : selectedGame === 'air-pong' ? <AirPong playerCount={playerCount} inputEvents={gameEvents} onExit={returnToSetup} /> : selectedGame === 'goalkeeper' ? <Goalkeeper playerCount={playerCount} inputEvents={gameEvents} onExit={returnToSetup} onComplete={tournament ? finishTournamentRound : undefined} /> : <BubbleBattle playerCount={playerCount} inputEvents={gameEvents} onComplete={tournament ? finishTournamentRound : undefined} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} />}</div>}<section className="camera-page" aria-labelledby="camera-title" hidden={gameActive}>
    <a className="back-link" href="#/catalog">← Games</a>
    <div className="camera-heading"><p className="eyebrow">Let’s play!</p><h1 id="camera-title">{tournament ? 'Tournament' : selectedTitle}</h1><p>Choose your players and jump in. Stand side by side and wave to play.</p></div>
    <fieldset className="player-count"><legend>Number of players</legend>{([1, 2, 3, 4] as const).map((count) => <button type="button" aria-pressed={playerCount === count} onClick={() => choosePlayerCount(count)} key={count}>{count}<small>{count === 1 ? 'player' : 'players'}</small></button>)}</fieldset>
    <div className="camera-layout">
      <div className={`camera-preview camera-preview--${status}`}>
        <video ref={videoRef} muted playsInline aria-label="Mirrored camera preview" />
        <canvas ref={captureCanvasRef} hidden />
        {status !== 'ready' && <div className="camera-placeholder"><strong>{status === 'requesting' ? 'Opening camera…' : 'Ready to move?'}</strong></div>}
        {status === 'ready' && <span className="camera-live">● Camera on</span>}
        <div className="camera-zones" aria-label="Player camera zones">{zones.map(zone => <div className={`camera-zone camera-zone--${zone.playerId}`} key={zone.playerId} style={{left: `${zone.x * 100}%`, top: `${zone.y * 100}%`, width: `${zone.width * 100}%`, height: `${zone.height * 100}%`}}><span>Player {zone.playerId}{(motion?.zones.find(item => item.playerId === zone.playerId)?.activity ?? 0) > .005 ? ' • moving!' : ''}</span></div>)}</div>
      </div>
      <div className="camera-controls"><h2>Everybody ready?</h2><p>Your camera stays on as you switch games. Pictures stay on this device. Close the tab to turn it off.</p>
      {failure && <div className="camera-error" role="alert"><strong>{failureCopy[failure].title}</strong><p>{failureCopy[failure].help}</p></div>}
      <button className="crayon-button crayon-button--primary" type="button" disabled={status === 'requesting'} onClick={() => { if(status === 'ready') beginPractice(); else void start() }}>{status === 'requesting' ? 'Opening camera…' : status === 'ready' ? `Play ${selectedTitle}` : 'Activate camera & play'}</button>
      </div>
    </div>
  </section></>
}
