import {ChallengeResult} from '../../game/ArcadeRound'
import {useChallenge} from '../../game/ChallengeContext'
import { useRoundRecovery, type RoundRecoveryProps } from '../../game/useRoundRecovery'
import { GameFeedback } from '../../game/GameFeedback'
import { useEffect, useState, type PointerEvent } from 'react'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { GoldRushModel, type GoldRushSnapshot } from './GoldRushModel'

export function GoldRush({ playerCount, inputEvents = [], externalPauseReason, onReconnect, onExit }: RoundRecoveryProps & { playerCount: PlayerCount; inputEvents?: MotionInputEvent[]; onExit(): void }) {
  const challenge = useChallenge()
  const pressure = challenge?.pressure ?? 0
  const [model] = useState(() => new GoldRushModel({ pressure, roundDurationMs: challenge ? 36_000 : undefined, playerCount }))
  const [snapshot, setSnapshot] = useState<GoldRushSnapshot>(() => model.start(performance.now()))
  const recovery = useRoundRecovery({ model, snapshot, setSnapshot, title: 'Gold Rush', externalPauseReason, onReconnect, onExit })
  useEffect(() => { let frame = 0, last = 0; const tick = (time: number) => { if (time - last >= 33) { setSnapshot(model.update(time)); last = time } frame = requestAnimationFrame(tick) }; frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame) }, [model])
  useEffect(() => { for (const event of inputEvents) setSnapshot(model.hit(event)) }, [model,inputEvents])
  const hit = (playerId: PlayerId, event: PointerEvent<HTMLDivElement>) => { const bounds = event.currentTarget.getBoundingClientRect(); setSnapshot(model.hit({ playerId, kind: 'MOTION_HIT', x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height, confidence: 1, timestamp: performance.now() })) }
  const players = Array.from({ length: playerCount }, (_, index) => (index + 1) as PlayerId)
  return <section className="gold-game" aria-labelledby="gold-title"><GameFeedback snapshot={snapshot} /><header className="bubble-game__header"><div><p className="eyebrow">Motion hit game</p><h1 id="gold-title">Gold Rush</h1></div><dl>{snapshot.scores.map(({ playerId, score }) => <div key={playerId}><dt>Player {playerId}</dt><dd>{score}</dd></div>)}<div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>{recovery.pauseButton}<button className="text-button" type="button" onClick={onExit}>Exit game</button></header><p className="gold-callout">Grab the <strong>gold coins</strong> — dodge the tumbling rocks!</p><div className={`gold-boards gold-boards--${playerCount}`}>{players.map((playerId) => <div className="gold-player" key={playerId}><h2>Player {playerId}</h2><div className="gold-board" aria-label={`Player ${playerId} Gold Rush play area`} onPointerDown={(event) => hit(playerId, event)}>{snapshot.items.filter((item) => item.playerId === playerId).map((item) => <i key={item.id} className={`gold-item gold-item--${item.kind}`} style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%` }} aria-label={item.kind === 'coin' ? 'gold coin' : 'rock hazard'}>{item.kind === 'coin' ? '★' : '×'}</i>)}{snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Get ready to grab gold!</span></div>}</div></div>)}</div>{recovery.pauseDialog}{snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Gold Rush results"><h2>Treasure tallied!</h2><ChallengeResult scores={snapshot.scores}/><div className="battle-results__scores">{snapshot.scores.map(({ playerId, score }) => <p key={playerId}><strong>Player {playerId}</strong><span>{score} points</span></p>)}</div><button className="crayon-button crayon-button--primary" type="button" onClick={() => setSnapshot(model.start(performance.now()))}>Play again</button></div>}</section>
}
