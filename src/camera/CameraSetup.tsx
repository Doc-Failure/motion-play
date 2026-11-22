import {FloorIsLava} from '../minigames/floor-is-lava/FloorIsLava'
import {lavaFeet} from '../input/LavaFeet'
import {PoseSwipes} from '../input/PoseSwipes'
import {JumpRush} from '../minigames/jump-rush/JumpRush'
import {ShadowSnap} from '../minigames/shadow-snap/ShadowSnap'
import {shadowPoseInput} from '../input/ShadowPoseInput'
import {bowlingSweep} from '../input/HandSwipe'
import {MarbleBowling} from '../minigames/marble-bowling/MarbleBowling'
import {ArcadeRound} from '../game/ArcadeRound'
import type {ArcadeGame} from '../game/arcade'
import {KangarooRace} from '../minigames/kangaroo-race/KangarooRace'
import {CameraSport} from '../minigames/camera-sports/CameraSport'
import {SixHoops} from '../minigames/six-hoops/SixHoops'
import {jumpInput} from '../input/JumpInput'
import {UfoJuggler} from '../minigames/ufo-juggler/UfoJuggler'
import {GhostCatcher} from '../minigames/ghost-catcher/GhostCatcher'
import {KeepUps} from '../minigames/keep-ups/KeepUps'
import {keepUpsInput} from '../input/KeepUpsInput'
import {getGameBySlug,isGameVisible} from '../app/catalog'
import {WebcamNavigation} from './WebcamNavigation'
import {WebcamMenuInput,menuPointers} from '../input/WebcamMenuInput'
import {retainArmCasts} from '../input/ArmMotionProcessor'
import {SilkSquad as SilkSquadPrototype} from '../minigames/silk-squad/SilkSquad'
import {PlayerReadyGate,type ReadyPoseSample} from './PlayerReadyGate'
import { RocketRumble as RocketRumblePrototype } from '../minigames/rocket-rumble/RocketRumble'
import { BodyTrackingTest } from './BodyTrackingTest'
import { MagicDuel as MagicDuelPrototype } from '../minigames/magic-duel/MagicDuel'
import { BasketballBlitz as BasketballBlitzPrototype } from '../minigames/basketball-blitz/BasketballBlitz'
import { BoxingChamp } from '../minigames/boxing-champ/BoxingChamp'
import { boxingInput } from '../input/BoxingInput'
import { FruitSlash as FruitSlashPrototype } from '../minigames/fruit-slash/FruitSlash'
import { Freeze as FreezePrototype } from '../minigames/freeze/Freeze'
import { DanceChallenge as DanceChallengePrototype } from '../minigames/dance-challenge/DanceChallenge'
import { LaserEscape as LaserEscapePrototype } from '../minigames/laser-escape/LaserEscape'
import { Dodgeball as DodgeballPrototype } from '../minigames/dodgeball/Dodgeball'
import { NinjaTraining } from '../minigames/ninja-training/NinjaTraining'
import { PackIcon } from '../design/PackIcon'
import { containCameraFrame } from '../game/cameraGeometry'
import { InputFeedbackContext } from '../game/InputFeedbackContext'
import { TowerBuilder as TowerBuilderPrototype } from '../minigames/tower-builder/TowerBuilder'
import { FishFrenzy as FishFrenzyPrototype } from '../minigames/fish-frenzy/FishFrenzy'
import { PlateSpinner } from '../minigames/plate-spinner/PlateSpinner'
import { GraffitiRace } from '../minigames/graffiti-race/GraffitiRace'
import { CarWash } from '../minigames/car-wash/CarWash'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CameraSource, CameraRequestCancelledError, cameraFailure, type CameraDevice, type CameraFailure } from './CameraSource'
import {
  defaultCameraZones,
  type PlayerCameraZone,
  type PlayerCount,
} from '../input/PlayerZoneMapper'
import { MotionProcessor, type MotionInputEvent, type MotionFrame, type MotionResult } from '../input/MotionProcessor'
import { BubbleBattle } from '../minigames/bubble-battle/BubbleBattle'
import { WindowWipe } from '../minigames/window-wipe/WindowWipe'
import { WhackAMole } from '../minigames/whack-a-mole/WhackAMole'
import { BalloonPanic } from '../minigames/balloon-panic/BalloonPanic'
import { GoldRush } from '../minigames/gold-rush/GoldRush'
import { PaintSplash } from '../minigames/paint-splash/PaintSplash'
import { SimonSays } from '../minigames/simon-says/SimonSays'
import { FruitCatcher } from '../minigames/fruit-catcher/FruitCatcher'
import { AirPong } from '../minigames/air-pong/AirPong'
import { PinataParty } from '../minigames/pinata-party/PinataParty'
import { TreasureGrab } from '../minigames/treasure-grab/TreasureGrab'
import { StarCollector } from '../minigames/star-collector/StarCollector'
import { PizzaMaker } from '../minigames/pizza-maker/PizzaMaker'
import { SupermarketRush } from '../minigames/supermarket-rush/SupermarketRush'
import { MonsterDefense } from '../minigames/monster-defense/MonsterDefense'
import { MeteorSmash } from '../minigames/meteor-smash/MeteorSmash'
import { TournamentSession,TOURNAMENT_GAME_COUNT } from '../game/TournamentSession'

// Hidden prototype remains available in development; it is not shipped in the public catalog build.
const FishFrenzy=import.meta.env.DEV?FishFrenzyPrototype:()=>null
const TowerBuilder=import.meta.env.DEV?TowerBuilderPrototype:()=>null
const RocketRumble=import.meta.env.DEV?RocketRumblePrototype:()=>null

const SilkSquad=import.meta.env.DEV?SilkSquadPrototype:()=>null
const MagicDuel=import.meta.env.DEV?MagicDuelPrototype:()=>null
const FruitSlash=import.meta.env.DEV?FruitSlashPrototype:()=>null
const BasketballBlitz = import.meta.env.DEV ? BasketballBlitzPrototype : () => null
const Freeze = import.meta.env.DEV ? FreezePrototype : () => null
const Dodgeball = import.meta.env.DEV ? DodgeballPrototype : () => null
const DanceChallenge = import.meta.env.DEV ? DanceChallengePrototype : () => null
const LaserEscape = import.meta.env.DEV ? LaserEscapePrototype : () => null
export type PlayableGame = 'floor-is-lava' | 'shadow-snap' | 'marble-bowling' | 'kangaroo-race' | 'net-rally' | 'six-hoops' | 'ufo-juggler' | 'ghost-catcher' | 'keep-ups' | 'silk-squad' | 'rocket-rumble' | 'magic-duel' | 'basketball-blitz' | 'punch-arena' | 'fruit-slash' | 'jump-rush' | 'freeze' | 'dance-challenge' | 'laser-escape' | 'dodgeball' | 'ninja-training' | 'tower-builder' | 'fish-frenzy' | 'plate-spinner' | 'graffiti-race' | 'pizza-maker' | 'car-wash' | 'treasure-grab' | 'star-collector' | 'supermarket-rush' | 'bubble-battle' | 'window-wipe' | 'whack-a-mole' | 'meteor-smash' | 'monster-defense' | 'pinata-party' | 'balloon-panic' | 'gold-rush' | 'paint-splash' | 'simon-says' | 'fruit-catcher' | 'air-pong' | 'goalkeeper'

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

export function CameraSetup({ workshop=false, source: providedSource, initialGame: requestedGame = 'bubble-battle', tournament = false, active = true, autoPlay = false, readyGateEnabled = true, webcamNavigation=false, navigationKey='', selectedPlayers }: { workshop?:boolean; source?: CameraController; selectedPlayers?:PlayerCount; initialGame?: PlayableGame; tournament?: boolean; active?: boolean; autoPlay?: boolean; readyGateEnabled?:boolean;webcamNavigation?:boolean;navigationKey?:string }) {
  const initialGame = !workshop && requestedGame === 'jump-rush' ? 'kangaroo-race' : requestedGame
  const [defaultSource] = useState<CameraController>(() => new CameraSource())
  const source = providedSource ?? defaultSource
  const videoRef = useRef<HTMLVideoElement>(null)
  const navigationVideoRef=useRef<HTMLVideoElement>(null)
  const [menuInput]=useState(()=>new WebcamMenuInput())
  const gameVideoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null)
  const processorRef = useRef(new MotionProcessor({spatialSampling:true}))
  const recentFramesRef = useRef<MotionFrame[]>([])
  const lastProcessedFrameRef = useRef(performance.now())
  const [, setDevices] = useState<CameraDevice[]>([])
  const [selected, setSelected] = useState('')
  const [status, setStatus] = useState<'idle' | 'requesting' | 'ready' | 'simulation'>('idle')
  const [failure, setFailure] = useState<CameraFailure | null>(null)
  const [localPlayers,setPlayerCount]=useState<PlayerCount>(1)
  const playerCount=selectedPlayers??localPlayers
  const [zones, setZones] = useState<PlayerCameraZone[]>(() => defaultCameraZones(1))
  const sensitivity = 70
  const [motion, setMotion] = useState<MotionResult | null>(null)
  const [, setFps] = useState(0)

  const [flow, setFlow] = useState<'setup' | 'playing' | 'tournament-results'>('setup')
  const [selectedGame, setSelectedGame] = useState<PlayableGame>(initialGame)
  const tournamentLength = TOURNAMENT_GAME_COUNT
  const tournamentSession = useRef<TournamentSession | null>(null)
  const [tournamentSnapshot, setTournamentSnapshot] = useState<ReturnType<TournamentSession['snapshot']> | null>(null)
  const [trackingLost, setTrackingLost] = useState(false)
  const gameActive = flow !== 'setup'
  const autoLaunched = useRef(false)
  const [armEvents,setArmEvents]=useState<MotionInputEvent[]>([])
  const [armAvailable,setArmAvailable]=useState<boolean|undefined>(undefined)
  const [readyGate,setReadyGate]=useState(false)
  const [readyPose,setReadyPose]=useState<ReadyPoseSample|null>(null)
  const receiveArms=useCallback((events:MotionInputEvent[])=>{const now=performance.now();setArmEvents(previous=>retainArmCasts(previous,events,now))},[])
  const requestReady=useCallback(()=>{setReadyPose(null);setReadyGate(true)},[])
  const swipes=useMemo(()=>new PoseSwipes(selectedGame==='marble-bowling'?bowlingSweep:undefined),[selectedGame])
  const [swipeEvents,setSwipeEvents]=useState<MotionInputEvent[]>([])
  const usesSwipes=['fruit-slash','magic-duel','basketball-blitz','marble-bowling'].includes(selectedGame)
  const usesBodyPose = usesSwipes || ['floor-is-lava', 'shadow-snap', 'punch-arena', 'keep-ups', 'jump-rush', 'kangaroo-race',
    'six-hoops', 'goalkeeper', 'net-rally'].includes(selectedGame)
  const receivePose=useCallback((bodies:ReadyPoseSample['bodies'],time:number)=>{if(readyGate||usesBodyPose)setReadyPose({bodies,time});if(usesSwipes)setSwipeEvents(swipes.sample(readyGate?[]:bodies,playerCount,time));if(webcamNavigation)menuInput.publish({events:menuPointers(bodies,playerCount,time),time})},[readyGate,webcamNavigation,menuInput,playerCount,usesBodyPose,swipes,usesSwipes])
  const [aligning,setAligning]=useState(false)
  const [trackingTest,setTrackingTest]=useState(true)
  const [artTrackingTest,setArtTrackingTest]=useState(false)
  const diagnosticsEnabled=(selectedGame==='ufo-juggler'||selectedGame==='ghost-catcher'||selectedGame==='window-wipe'||usesBodyPose)?artTrackingTest:trackingTest
  const showSkeleton=diagnosticsEnabled&&selectedGame!=='ninja-training'
  const toggleTracking=()=>{if(selectedGame==='ufo-juggler'||selectedGame==='ghost-catcher'||selectedGame==='window-wipe'||usesBodyPose)setArtTrackingTest(value=>!value);else setTrackingTest(value=>!value)}
  const [cameraAspect, setCameraAspect] = useState(16 / 9)
  const [viewport, setViewport] = useState(() => ({width:window.innerWidth,height:window.innerHeight}))
  useEffect(() => {
    const resize = () => setViewport({width:window.innerWidth,height:window.innerHeight})
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  const cameraFrame = containCameraFrame(viewport.width, viewport.height, cameraAspect)
  const beginGame = useCallback(() => {
    autoLaunched.current = true
    if (tournament && !tournamentSession.current) {
      tournamentSession.current = new TournamentSession(playerCount, tournamentLength)
      setSelectedGame(tournamentSession.current.currentRound!.game)
      setTournamentSnapshot(tournamentSession.current.snapshot())
    }
    setReadyGate(readyGateEnabled);setReadyPose(null)
    setFlow('playing')
  }, [readyGateEnabled,playerCount, tournament, tournamentLength])
  const returnToSetup = useCallback(() => { setReadyGate(false);setReadyPose(null); tournamentSession.current = null; setTournamentSnapshot(null); setFlow('setup');if(selectedPlayers!==undefined)window.location.hash='#/catalog' }, [selectedPlayers])
  const finishTournamentRound = useCallback((game:PlayableGame,scores: { playerId: 1 | 2 | 3 | 4; score: number }[]) => {
    const session = tournamentSession.current
    if (!session||session.currentRound?.game!==game) return
    const next = session.record(scores)
    setTournamentSnapshot(next)
    if (next.isComplete) setFlow('tournament-results')
    else { setSelectedGame(next.currentRound!.game); setFlow('playing') }
  }, [])

  const completeCurrentRound=useCallback((scores:{playerId:1|2|3|4;score:number}[])=>finishTournamentRound(selectedGame,scores),[selectedGame,finishTournamentRound])
  const tournamentHeading=useRef<HTMLHeadingElement>(null)
  useEffect(()=>{if(flow==='tournament-results')tournamentHeading.current?.focus()},[flow])

  useEffect(()=>{setZones(defaultCameraZones(playerCount))},[playerCount])
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
    // Keep the capture stream owned by CameraSource across routes, but only
    // decode it in the currently visible preview or game video.
    const video = active ? (gameActive ? gameVideoRef.current : videoRef.current) : webcamNavigation ? navigationVideoRef.current : null
    if (status !== 'ready' || !video || !streamRef.current) return
    const syncVideoSize = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) setCameraAspect(video.videoWidth / video.videoHeight)
    }
    video.addEventListener('loadedmetadata', syncVideoSize)
    video.addEventListener('resize', syncVideoSize)
    video.srcObject = streamRef.current
    void Promise.resolve(video.play()).catch(() => undefined)
    return () => {
      video.removeEventListener('loadedmetadata', syncVideoSize)
      video.removeEventListener('resize', syncVideoSize)
      video.pause()
      video.srcObject = null
    }
  }, [active, gameActive, status,webcamNavigation])

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
    let lastVideoTime: number | null = null
    let windowStart = performance.now()
    const processFrame = () => {
      if (stopped) return
      const captureStarted=performance.now()
      let frame: MotionFrame | null = null
      if (status === 'simulation') frame = null
      else {
        const video = gameActive ? gameVideoRef.current : videoRef.current; const canvas = captureCanvasRef.current
        // A cached image is not a new observation of stillness. Require the
        // decoder clock to advance so stalled/paused feeds reach recovery.
        if (video && canvas && video.videoWidth > 0 && video.readyState >= 2
          && !video.paused && !video.ended && Number.isFinite(video.currentTime) && video.currentTime !== lastVideoTime) {
          if(canvas.width!==160)canvas.width=160
          if(canvas.height!==90)canvas.height=90
          const context = canvas.getContext('2d', { willReadFrequently: true })
          context?.drawImage(video, 0, 0, canvas.width, canvas.height)
          if (context) {
            frame = { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data }
            lastVideoTime = video.currentTime
          }
        }
      }
      if (frame) {
        lastProcessedFrameRef.current = performance.now()
        setTrackingLost(false)
        recentFramesRef.current = [...recentFramesRef.current.slice(-11), frame]
        setMotion(processorRef.current.process(frame, zones, captureStarted))
        frames += 1
        const now = performance.now()
        if (now - windowStart >= 500) { setFps(Math.round(frames * 1000 / (now - windowStart))); frames = 0; windowStart = now }
      }
      // Include processing in the sampling period. Leave CPU time for painting on slow devices.
      const cost=performance.now()-captureStarted
      timer = window.setTimeout(processFrame,Math.max(12,33-cost,2*cost))
    }
    processorRef.current.reset()
    processFrame()
    return () => { stopped = true; window.clearTimeout(timer) }
  }, [status, zones, gameActive, active])

  const start = useCallback(async (playWhenReady = false) => {
    setStatus('requesting')
    setFailure(null)
    setMotion(null)
    try {
      const stream = await source.start(selected || undefined, () => {
        streamRef.current = null
        setStatus('idle')
        setFailure('disconnected')
      })
      streamRef.current = stream
      lastProcessedFrameRef.current = performance.now()
      setTrackingLost(false)
      setStatus('ready')
      await refreshDevices()
      if (playWhenReady) beginGame()
    } catch (error) {
      if (error instanceof CameraRequestCancelledError) return
      setStatus('idle')
      setFailure(cameraFailure(error))
    }
  }, [source, selected, refreshDevices, beginGame])

  useEffect(() => {
    if ((webcamNavigation||active) && ((initialGame !== 'fish-frenzy' && initialGame !== 'fruit-slash' && initialGame !== 'punch-arena' && initialGame !== 'basketball-blitz' && initialGame !== 'magic-duel') || autoPlay) && status === 'idle' && !failure){const timer=setTimeout(()=>void start(),0);return()=>clearTimeout(timer)}
  }, [active, initialGame, autoPlay, status, failure, start,webcamNavigation])

  useEffect(() => {
    autoLaunched.current = false
    // A hidden route retains the camera, never a running game or its audio.
    setReadyGate(false);setReadyPose(null)
    setFlow('setup')
    tournamentSession.current = null
    setTournamentSnapshot(null)
    if (active) setSelectedGame(initialGame)
  }, [active, initialGame, tournament, autoPlay])

  useEffect(() => {
    if (active && autoPlay && !autoLaunched.current && !gameActive && (status === 'ready' || status === 'simulation')) beginGame()
  }, [active, autoPlay, gameActive, status, beginGame])

  const recoveryReason = readyGate ? 'Everyone hold a hand on your ready button.' : aligning ? 'Aligning player tracking. Hold both hands up until the check is complete.' : trackingLost
    ? 'Camera frames stopped for three seconds. Check lighting, framing, or the camera connection.'
    : flow === 'playing' && status === 'requesting' ? 'Reconnecting the camera…'
      : flow === 'playing' && status === 'idle' && failure
        ? failure === 'disconnected' ? 'The camera disconnected. Reconnect it to continue this round.' : `${failureCopy[failure].title}. ${failureCopy[failure].help}`
        : null
  const selectedTitle=tournament?'Tournament':getGameBySlug(selectedGame)?.title??'Game'
  // Position-controlled props use one stable movement center per player;
  // hits and brushes use occupied mask samples across the moving body.
  const positionEvents = (motion?.zones ?? []).flatMap(zone => {
    const sample = motion?.positions?.find(event => event.playerId === zone.playerId)
    return sample && zone.centroid ? [{...sample,...zone.centroid}] : []
  })
  const gameEvents = aligning||readyGate ? [] : selectedGame==='shadow-snap'?shadowPoseInput(readyPose?.bodies??[],playerCount,readyPose?.time??0):(selectedGame==='six-hoops'||selectedGame==='goalkeeper'||selectedGame==='net-rally')?keepUpsInput(readyPose?.bodies??[],playerCount,readyPose?.time??0,true,selectedGame==='six-hoops'?'player':'court'):(selectedGame==='jump-rush'||selectedGame==='kangaroo-race')?jumpInput(readyPose?.bodies??[],playerCount,readyPose?.time??0):selectedGame==='keep-ups'?keepUpsInput(readyPose?.bodies??[],playerCount,readyPose?.time??0):selectedGame==='punch-arena'?boxingInput(readyPose?.bodies??[],playerCount,readyPose?.time??0): (selectedGame==='ufo-juggler'||selectedGame==='ghost-catcher')?(motion?.positions??[]): selectedGame==='silk-squad'?armEvents: selectedGame === 'ninja-training' ? [...(motion?.events ?? []), ...positionEvents.map(event => ({...event,kind:'BODY_MOVE' as const}))] : usesSwipes ? swipeEvents : selectedGame === 'freeze' ? motion?.freezeSamples ?? [] : selectedGame === 'graffiti-race' || selectedGame === 'car-wash' || selectedGame === 'window-wipe' || selectedGame === 'paint-splash'
    ? (motion?.positions ?? []).map((event) => ({ ...event, kind: 'MOTION_BRUSH' as const }))
    : selectedGame === 'tower-builder' || selectedGame === 'fish-frenzy' || selectedGame === 'fruit-catcher' || selectedGame === 'air-pong' ? positionEvents.map((event) => ({ ...event, kind: 'HAND_POSITION' as const }))
      : selectedGame === 'dance-challenge' || selectedGame === 'dodgeball' || selectedGame === 'laser-escape' ? positionEvents.map((event) => ({ ...event, kind: 'BODY_MOVE' as const })) : motion?.events ?? []

  return <>{active && gameActive && <div className={`game-stage camera-play game-stage--${status}`} data-players={playerCount} data-flow={flow}><div className="camera-arena" data-guided={selectedPlayers!==undefined} style={cameraFrame}><InputFeedbackContext.Provider value={{events:gameEvents,playerCount,aspectRatio:cameraAspect/playerCount,readyGateActive:readyGate,requestReadyGate:readyGateEnabled?requestReady:undefined,workshopHud:workshop&&!isGameVisible(selectedGame)?{title:selectedTitle,exit:returnToSetup}:undefined}}><video ref={gameVideoRef} className="game-camera" muted playsInline aria-label="Mirrored live camera during gameplay" />{tournament && flow !== 'tournament-results' && tournamentSnapshot && <aside className="tournament-ribbon" aria-label="Tournament progress"><strong>Round {tournamentSnapshot.roundIndex + 1} of {tournamentSnapshot.length}: {tournamentSnapshot.currentRound?.title}</strong><span>Highest total points wins</span><span>{tournamentSnapshot.totals.map((entry) => `P${entry.playerId} ${entry.score}`).join(' • ')}</span></aside>}<ArcadeRound key={selectedGame} game={selectedGame as ArcadeGame} players={playerCount} enabled={!tournament&&(workshop||isGameVisible(selectedGame))}>{flow === 'tournament-results' ? <div className="tournament-results" role="dialog" aria-label="Tournament results"><p className="eyebrow">Tournament complete</p><h1 ref={tournamentHeading} tabIndex={-1}>{tournamentSnapshot?.winners.length===1?`Player ${tournamentSnapshot.winners[0].playerId} wins!`:`Joint winners: ${tournamentSnapshot?.winners.map(w=>`Player ${w.playerId}`).join(" & ")}`}</h1><p>Highest total points across {tournamentLength} games</p><ol>{tournamentSnapshot?.ranking.map((entry) => <li key={entry.playerId}><strong>Player {entry.playerId}</strong><span>{entry.score} points</span></li>)}</ol>{tournamentSnapshot && tournamentSnapshot.cooperativeTotal > 0 && <p className="team-total">Team score: <strong>{tournamentSnapshot.cooperativeTotal}</strong></p>}<button className="crayon-button crayon-button--primary" type="button" onClick={()=>{if(selectedPlayers===undefined)returnToSetup();else{tournamentSession.current=null;beginGame()}}}>New tournament</button><a className="text-button" href="#/">Home</a></div> : import.meta.env.DEV && workshop && selectedGame==='jump-rush' ? <JumpRush playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={()=>void start()} onExit={returnToSetup}/> : selectedGame === 'floor-is-lava' ? <FloorIsLava frame={cameraFrame} playerCount={playerCount} sample={readyPose && !readyGate && !aligning ? lavaFeet(readyPose.bodies,readyPose.time) : undefined} simulation={status==='simulation'} externalPauseReason={recoveryReason} onReconnect={()=>void start()} onExit={returnToSetup}/> : selectedGame === 'shadow-snap' ? <ShadowSnap aspect={cameraAspect} playerCount={playerCount} inputEvents={gameEvents} simulation={status==='simulation'} externalPauseReason={recoveryReason} onReconnect={()=>void start()} onExit={returnToSetup}/> : selectedGame === 'marble-bowling' ? <MarbleBowling manual={status==='simulation'} playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={()=>void start()} onExit={returnToSetup}/> : selectedGame === 'kangaroo-race' ? <KangarooRace playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={()=>void start()} onExit={returnToSetup}/> : selectedGame === 'net-rally' ? <CameraSport mode="net" playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={()=>void start()} onExit={returnToSetup}/> : selectedGame === 'six-hoops' ? <SixHoops playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={()=>void start()} onExit={returnToSetup}/> : selectedGame === 'ufo-juggler' ? <UfoJuggler playerCount={playerCount} inputEvents={gameEvents} onComplete={tournament?completeCurrentRound:undefined} externalPauseReason={recoveryReason} onReconnect={()=>void start()} onExit={returnToSetup}/> : selectedGame === 'ghost-catcher' ? <GhostCatcher playerCount={playerCount} inputEvents={gameEvents} onComplete={tournament?completeCurrentRound:undefined} externalPauseReason={recoveryReason} onReconnect={()=>void start()} onExit={returnToSetup}/> : selectedGame === 'keep-ups' ? <KeepUps playerCount={playerCount} inputEvents={gameEvents} onComplete={tournament?completeCurrentRound:undefined} externalPauseReason={recoveryReason} onReconnect={()=>void start()} onExit={returnToSetup} trackingHint={status==='ready'&&(!readyPose?.bodies.length||armAvailable===false)?'Step back until your head and arms are visible. Check body tracking if the ball passes through you.':undefined}/> : selectedGame === 'silk-squad' ? <SilkSquad playerCount={playerCount} inputEvents={gameEvents} armTrackingAvailable={status==='ready'?armAvailable:false} externalPauseReason={recoveryReason} onReconnect={()=>void start()} onExit={returnToSetup}/> : selectedGame === 'rocket-rumble' ? <RocketRumble playerCount={playerCount} inputEvents={gameEvents} onComplete={tournament ? completeCurrentRound : undefined} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'magic-duel' ? <MagicDuel playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'basketball-blitz' ? <BasketballBlitz playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'punch-arena' ? <BoxingChamp trackingHint={status!=='ready'?undefined:armAvailable===false?'Body tracking unavailable. Use Space / ↓, or return to games.':armAvailable!==true||!readyPose||readyPose.bodies.length<playerCount||readyPose.bodies.some(b=>!b.head||!b.hands.length)?'Step back until everyone’s head and hands are in view.':undefined} onComplete={tournament ? completeCurrentRound : undefined} playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'fruit-slash' ? <FruitSlash playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'freeze' ? <Freeze playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'dance-challenge' ? <DanceChallenge playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'laser-escape' ? <LaserEscape playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'dodgeball' ? <Dodgeball playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'tower-builder' ? <TowerBuilder playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'ninja-training' ? <NinjaTraining playerCount={playerCount} inputEvents={gameEvents} onComplete={tournament ? completeCurrentRound : undefined} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'fish-frenzy' ? <FishFrenzy playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : import.meta.env.DEV && selectedGame === 'plate-spinner' ? <PlateSpinner playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : import.meta.env.DEV && selectedGame === 'pizza-maker' ? <PizzaMaker playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : import.meta.env.DEV && selectedGame === 'graffiti-race' ? <GraffitiRace playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : import.meta.env.DEV && selectedGame === 'car-wash' ? <CarWash playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'window-wipe' ? <WindowWipe playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} onComplete={tournament ? completeCurrentRound : undefined} /> : import.meta.env.DEV && selectedGame === 'paint-splash' ? <PaintSplash playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} onComplete={tournament ? completeCurrentRound : undefined} /> : selectedGame === 'whack-a-mole' ? <WhackAMole playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} onComplete={tournament ? completeCurrentRound : undefined} /> : selectedGame === 'treasure-grab' ? <TreasureGrab playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'star-collector' ? <StarCollector playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'supermarket-rush' ? <SupermarketRush playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'monster-defense' ? <MonsterDefense playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'pinata-party' ? <PinataParty playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'meteor-smash' ? <MeteorSmash playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'balloon-panic' ? <BalloonPanic playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'gold-rush' ? <GoldRush playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'simon-says' ? <SimonSays playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'fruit-catcher' ? <FruitCatcher playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'air-pong' ? <AirPong playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : selectedGame === 'goalkeeper' ? <CameraSport mode="keeper" playerCount={playerCount} inputEvents={gameEvents} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} /> : <BubbleBattle playerCount={playerCount} inputEvents={gameEvents} onComplete={tournament ? completeCurrentRound : undefined} externalPauseReason={recoveryReason} onReconnect={() => void start()} onExit={returnToSetup} />}</ArcadeRound></InputFeedbackContext.Provider>{status==='ready'&&<>{active&&(showSkeleton||readyGate||webcamNavigation||usesBodyPose||selectedGame==='silk-squad')&&<BodyTrackingTest videoRef={gameVideoRef} players={playerCount} compact onAlignmentChange={setAligning} showSkeleton={showSkeleton&&selectedGame!=='shadow-snap'} withMasks={selectedGame==='shadow-snap'} readyMode={readyGate} withArms={selectedGame==='silk-squad'} armInputEnabled={!readyGate&&!aligning&&!trackingLost} onArmEvents={receiveArms} onTrackingStatus={setArmAvailable} onPoseSample={readyGate||webcamNavigation||usesBodyPose?receivePose:undefined}/>}</>}{readyGate&&<PlayerReadyGate key={playerCount} introGame={selectedPlayers!==undefined?selectedGame:undefined} players={playerCount} sample={readyPose} aspect={cameraAspect} enabled={(status==='ready'&&!trackingLost)||status==='simulation'} onComplete={()=>setReadyGate(false)} onBack={()=>{if(selectedPlayers!==undefined)window.location.hash='#/catalog';else returnToSetup()}} onReconnect={()=>void start()}/>}</div></div>}<section className={`camera-lobby${selectedPlayers!==undefined?' camera-lobby--guided':''}`} aria-labelledby="camera-title" hidden={gameActive || !active} data-players={playerCount}>
    <div className="camera-lobby__frame" style={cameraFrame}>
      <video ref={videoRef} muted playsInline aria-label="Mirrored camera preview" />
      <canvas ref={captureCanvasRef} hidden />
      <div className="camera-lobby__guidance">{tournament&&<p>{tournamentLength} games · highest total points wins</p>}<p>Start about 2–3 m (6–10 ft) from the camera.<small>{playerCount>1?'Stand side by side. Step back until everyone’s outstretched arms fit.':'Step back until your head, hips and outstretched arms fit on screen.'}</small></p>{status==='ready'&&selectedGame!=='ninja-training'&&<button className="camera-lobby__test" type="button" aria-pressed={showSkeleton} onClick={toggleTracking}>{showSkeleton?'Hide body tracking':'Test body tracking'}</button>}</div>
      {active&&!gameActive&&status==='ready'&&(showSkeleton||webcamNavigation)&&<BodyTrackingTest videoRef={videoRef} players={playerCount} showSkeleton={showSkeleton} onPoseSample={webcamNavigation?receivePose:undefined}/>}
      {status !== 'ready' && <div className="camera-lobby__placeholder" role="status">{status === 'requesting' ? 'Opening camera…' : status === 'simulation' ? 'Playing without camera' : 'Ready to play?'}</div>}
      <div className="camera-lobby__zones" aria-label="Player camera zones">{zones.map(zone => <div key={zone.playerId} style={{left:`${zone.x * 100}%`,width:`${zone.width * 100}%`}}>{playerCount > 1 && <span>Player {zone.playerId}</span>}</div>)}</div>
      <header className="camera-lobby__top"><a className="camera-lobby__back" href="#/catalog" aria-label="Back to games">← Games</a><h1 id="camera-title">{selectedTitle}</h1>{status === 'ready' && <span className="camera-lobby__live">● Camera on</span>}</header>
      {failure && <div className="camera-lobby__error" role="alert"><strong>{failureCopy[failure].title}</strong><p>{failureCopy[failure].help}</p>{selectedPlayers!==undefined&&<button type="button" onClick={()=>void start()}>Retry camera</button>}</div>}
      <div className="camera-lobby__actions">
        <fieldset className="camera-lobby__players"><legend>Players</legend>{([1,2,3,4] as const).map(count => <button type="button" aria-label={`${count} ${count === 1 ? 'player' : 'players'}`} aria-pressed={playerCount === count} onClick={() => choosePlayerCount(count)} key={count}>{count}</button>)}</fieldset>
        <button className="camera-lobby__play" type="button" disabled={status === 'requesting'} onClick={() => {if(status === 'ready' || status === 'simulation') beginGame(); else void start(true)}}><PackIcon name="play" />{status === 'requesting' ? 'Opening camera…' : status === 'ready' || status === 'simulation' ? `Play ${selectedTitle}` : 'Activate camera & play'}</button>
        {(status === 'idle' || status === 'requesting') && <button className="camera-lobby__fallback" type="button" disabled={status === 'requesting'} onClick={() => { source.stop(); streamRef.current = null; if (videoRef.current) videoRef.current.srcObject = null; setMotion(null); setFailure(null); setStatus('simulation'); beginGame() }}>Play without camera</button>}
        {status === 'simulation' && <button className="camera-lobby__fallback" type="button" onClick={() => void start()}>Use camera instead</button>}
      </div>
      <p className="sr-only">Camera pictures stay on this device. Your camera stays active between games until you close this tab.</p>
    </div>
  </section>{webcamNavigation&&<WebcamNavigation feed={menuInput} videoRef={navigationVideoRef} cameraView={active} activeFrame={cameraFrame} activeVideoRef={gameActive?gameVideoRef:videoRef} readyCheck={readyGate} ready={status==='ready'} requesting={status==='requesting'} players={playerCount} routeKey={`${navigationKey}|${flow}|${selectedGame}|${readyGate}|${aligning}`} onStart={()=>void start()} onPose={receivePose}/>}</>
}
