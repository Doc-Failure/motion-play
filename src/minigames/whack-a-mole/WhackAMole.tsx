import {ChallengeResult} from '../../game/ArcadeRound'
import {useChallenge} from '../../game/ChallengeContext'
import { KeyboardPlayArea } from '../../game/KeyboardPlayArea'
import { useRoundRecovery } from '../../game/useRoundRecovery'
import { GameFeedback } from '../../game/GameFeedback'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { WhackAMoleModel, type WhackAMoleSnapshot } from './WhackAMoleModel'

export function WhackAMole({ playerCount, inputEvents = [], onExit, onComplete, externalPauseReason, onReconnect }: { playerCount: PlayerCount; inputEvents?: MotionInputEvent[]; onExit(): void; externalPauseReason?: string | null; onReconnect?(): void; onComplete?: (scores: { playerId: PlayerId; score: number }[]) => void }) {
  const challenge = useChallenge()
  const pressure = challenge?.pressure ?? 0
  const [model] = useState(() => new WhackAMoleModel({ pressure, roundDurationMs: challenge ? 36_000 : undefined, playerCount }))
  const [snapshot, setSnapshot] = useState<WhackAMoleSnapshot>(() => model.start(performance.now()))
  const completionSent = useRef(false)
  const recovery = useRoundRecovery({ model, snapshot, setSnapshot, title: 'Whack-a-Mole', externalPauseReason, onReconnect, onExit })
  useEffect(() => { let frame = 0, last = 0; const tick = (time: number) => { if (time - last >= 33) { setSnapshot(model.update(time)); last = time } frame = requestAnimationFrame(tick) }; frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame) }, [model])
  useEffect(() => { for (const event of inputEvents) setSnapshot(model.hit(event)) }, [model,inputEvents])
  useEffect(() => { if (snapshot.phase === 'results' && onComplete && !completionSent.current) { completionSent.current = true; onComplete(snapshot.scores) } }, [onComplete, snapshot])
  const hit = (playerId: PlayerId, event: PointerEvent<HTMLDivElement>) => { const bounds = event.currentTarget.getBoundingClientRect(); setSnapshot(model.hit({ playerId, kind: 'MOTION_HIT', x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height, confidence: 1, timestamp: performance.now() })) }
  const players = Array.from({ length: playerCount }, (_, index) => (index + 1) as PlayerId)
  return <section className="mole-game" aria-labelledby="mole-title"><GameFeedback snapshot={snapshot} /><header className="bubble-game__header"><div><p className="eyebrow">Motion hit game</p><h1 id="mole-title">Whack-a-Mole</h1></div><dl>{snapshot.scores.map(({ playerId, score }) => <div key={playerId}><dt>Player {playerId}</dt><dd>{score}</dd></div>)}<div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>{recovery.pauseButton}<button className="text-button" type="button" onClick={onExit}>Exit game</button></header><p className="bubble-game__rules">Hit each mole before it ducks away. Every mole is worth 10 points.</p><div className={`mole-boards mole-boards--${playerCount}`}>{players.map((playerId) => <div className="mole-player" key={playerId}><h2>Player {playerId}</h2><KeyboardPlayArea className="mole-board" enabled={snapshot.phase === 'playing'} onAction={(x, y) => setSnapshot(model.hit({ playerId, kind: 'MOTION_HIT', x, y, confidence: 1, timestamp: performance.now() }))} aria-label={`Player ${playerId} Whack-a-Mole play area`} onPointerDown={(event) => hit(playerId, event)}>{Array.from({ length: 9 }, (_, hole) => <span className="mole-hole" key={hole}>{snapshot.moles.some((mole) => mole.playerId === playerId && mole.hole === hole) && <i className="mole" aria-hidden="true">●<b>⌣</b></i>}</span>)}{snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Ready your hands!</span></div>}</KeyboardPlayArea></div>)}</div>{recovery.pauseDialog}{snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Whack-a-Mole results"><h2 ref={recovery.resultsHeading} tabIndex={-1}>Great whacking!</h2><ChallengeResult scores={snapshot.scores}/><div className="battle-results__scores">{snapshot.scores.map(({ playerId, score }) => <p key={playerId}><strong>Player {playerId}</strong><span>{score} points</span></p>)}</div><button className="crayon-button crayon-button--primary" type="button" onClick={() => setSnapshot(model.start(performance.now()))}>Play again</button></div>}</section>
}
