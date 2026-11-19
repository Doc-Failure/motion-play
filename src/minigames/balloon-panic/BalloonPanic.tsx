import {ChallengeResult} from '../../game/ArcadeRound'
import {useChallenge} from '../../game/ChallengeContext'
import { useRoundRecovery, type RoundRecoveryProps } from '../../game/useRoundRecovery'
import { GameFeedback } from '../../game/GameFeedback'
import { useEffect, useState, type PointerEvent } from 'react'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { BalloonPanicModel, type BalloonPanicSnapshot } from './BalloonPanicModel'

export function BalloonPanic({ playerCount, inputEvents = [], externalPauseReason, onReconnect, onExit }: RoundRecoveryProps & { playerCount: PlayerCount; inputEvents?: MotionInputEvent[]; onExit(): void }) {
  const challenge = useChallenge()
  const pressure = challenge?.pressure ?? 0
  const [model] = useState(() => new BalloonPanicModel({ pressure, roundDurationMs: challenge ? 36_000 : undefined, playerCount }))
  const [snapshot, setSnapshot] = useState<BalloonPanicSnapshot>(() => model.start(performance.now()))
  const recovery = useRoundRecovery({ model, snapshot, setSnapshot, title: 'Balloon Panic', externalPauseReason, onReconnect, onExit })
  useEffect(() => { let frame = 0, last = 0; const tick = (time: number) => { if (time - last >= 33) { setSnapshot(model.update(time)); last = time } frame = requestAnimationFrame(tick) }; frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame) }, [model])
  useEffect(() => { for (const event of inputEvents) setSnapshot(model.hit(event)) }, [model,inputEvents])
  const hit = (playerId: PlayerId, event: PointerEvent<HTMLDivElement>) => { const bounds = event.currentTarget.getBoundingClientRect(); setSnapshot(model.hit({ playerId, kind: 'MOTION_HIT', x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height, confidence: 1, timestamp: performance.now() })) }
  const players = Array.from({ length: playerCount }, (_, index) => (index + 1) as PlayerId)
  return <section className="balloon-game" aria-labelledby="balloon-title"><GameFeedback snapshot={snapshot} /><header className="bubble-game__header"><div><p className="eyebrow">Motion hit game</p><h1 id="balloon-title">Balloon Panic</h1></div><dl>{snapshot.scores.map(({ playerId, score }) => <div key={playerId}><dt>Player {playerId}</dt><dd>{score}</dd></div>)}<div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>{recovery.pauseButton}<button className="text-button" type="button" onClick={onExit}>Exit game</button></header><p className="balloon-callout">{playerCount === 1 ? <>Hit only <strong className={`balloon-word balloon-word--${snapshot.targetColor}`}>{snapshot.targetColor}</strong> balloons!</> : 'Hit the color called in your lane!'}</p><div className={`balloon-boards balloon-boards--${playerCount}`}>{players.map((playerId) => <div className="balloon-player" key={playerId}><h2>Player {playerId} · {snapshot.calls[playerId]}</h2><div className="balloon-board" aria-label={`Player ${playerId} Balloon Panic play area`} onPointerDown={(event) => hit(playerId, event)}>{snapshot.balloons.filter((balloon) => balloon.playerId === playerId).map((balloon) => <i key={balloon.id} className={`panic-balloon panic-balloon--${balloon.color}`} style={{ left: `${balloon.x * 100}%`, top: `${balloon.y * 100}%` }} aria-label={`${balloon.color} balloon`} />)}{snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Watch the color!</span></div>}</div></div>)}</div>{recovery.pauseDialog}{snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Balloon Panic results"><h2>Balloon brilliant!</h2><ChallengeResult scores={snapshot.scores}/><div className="battle-results__scores">{snapshot.scores.map(({ playerId, score }) => <p key={playerId}><strong>Player {playerId}</strong><span>{score} points</span></p>)}</div><button className="crayon-button crayon-button--primary" type="button" onClick={() => setSnapshot(model.start(performance.now()))}>Play again</button></div>}</section>
}
