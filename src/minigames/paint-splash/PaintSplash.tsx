import {ChallengeResult} from '../../game/ArcadeRound'
import {useChallenge} from '../../game/ChallengeContext'
import { useRoundRecovery, type RoundRecoveryProps } from '../../game/useRoundRecovery'
import { GameFeedback } from '../../game/GameFeedback'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { PAINT_COLUMNS, PAINT_ROWS, PaintSplashModel, type PaintSplashSnapshot } from './PaintSplashModel'

const colors = ['pink', 'yellow', 'blue', 'green'] as const

export function PaintSplash({ playerCount, inputEvents = [], externalPauseReason, onReconnect, onExit, onComplete }: RoundRecoveryProps & { playerCount: PlayerCount; inputEvents?: MotionInputEvent[]; onExit(): void; onComplete?: (scores: { playerId: PlayerId; score: number }[]) => void }) {
  const challenge = useChallenge()
  const [model] = useState(() => new PaintSplashModel({ playerCount, pressure:challenge?.pressure, roundDurationMs:challenge ? 40000 : undefined }))
  const [snapshot, setSnapshot] = useState<PaintSplashSnapshot>(() => model.start(performance.now()))
  const completionSent = useRef(false)
  const recovery = useRoundRecovery({ model: model, snapshot, setSnapshot, title: 'Paint Splash', externalPauseReason, onReconnect, onExit })
  useEffect(() => { let frame = 0, last = 0; const tick = (time: number) => { if (time - last >= 33) { setSnapshot(model.update(time)); last = time } frame = requestAnimationFrame(tick) }; frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame) }, [model])
  useEffect(() => { for (const event of inputEvents) setSnapshot(model.brush(event)) }, [inputEvents,model])
  useEffect(() => { if (snapshot.phase === 'results' && onComplete && !completionSent.current) { completionSent.current = true; onComplete(snapshot.scores) } }, [onComplete, snapshot])
  const brush = (playerId: PlayerId, event: PointerEvent<HTMLDivElement>) => { const bounds = event.currentTarget.getBoundingClientRect(); setSnapshot(model.brush({ playerId, kind: 'MOTION_BRUSH', x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height, confidence: 1, timestamp: performance.now() })) }
  const [cursors,setCursors]=useState<Partial<Record<PlayerId,number>>>({})
  function paintWithKey(playerId:PlayerId,event:KeyboardEvent<HTMLDivElement>) {
    if(snapshot.phase!=='playing'||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter'].includes(event.key))return
    event.preventDefault()
    const cell=cursors[playerId]??Math.floor(PAINT_ROWS/2)*PAINT_COLUMNS+Math.floor(PAINT_COLUMNS/2)
    const col=Math.max(0,Math.min(PAINT_COLUMNS-1,cell%PAINT_COLUMNS+(event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0)))
    const row=Math.max(0,Math.min(PAINT_ROWS-1,Math.floor(cell/PAINT_COLUMNS)+(event.key==='ArrowUp'?-1:event.key==='ArrowDown'?1:0)))
    setCursors(old=>({...old,[playerId]:row*PAINT_COLUMNS+col}))
    setSnapshot(model.brush({kind:'MOTION_BRUSH',playerId,x:(col+.5)/PAINT_COLUMNS,y:(row+.5)/PAINT_ROWS,timestamp:performance.now(),confidence:1,pointerId:'keyboard'}))
  }
  const players = Array.from({ length: playerCount }, (_, index) => (index + 1) as PlayerId)
  return <section className="paint-game" aria-labelledby="paint-title"><GameFeedback snapshot={snapshot} /><header className="bubble-game__header"><div><p className="eyebrow">Motion brush game</p><h1 id="paint-title">Paint Splash</h1></div><dl>{players.map((playerId) => <div key={playerId}><dt>Player {playerId}</dt><dd>{snapshot.coverage[playerId]}%</dd></div>)}<div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>{recovery.pauseButton}<button className="text-button" type="button" onClick={onExit}>Exit game</button></header><p className="paint-callout">Wave your brush across the paper. Every fresh patch adds to your score!</p><div className={`paint-boards paint-boards--${playerCount}`}>{players.map((playerId) => <div className="paint-player" key={playerId}><h2>Player {playerId}</h2><div className="paint-board" role="group" tabIndex={0} onKeyDown={e=>paintWithKey(playerId,e)} aria-label={`Player ${playerId} Paint Splash play area`} onPointerMove={(event) => { if (event.buttons) brush(playerId, event) }} onPointerDown={(event) => brush(playerId, event)}>{Array.from({ length: PAINT_COLUMNS * PAINT_ROWS }, (_, cell) => <span key={cell} style={cursors[playerId]===cell?{outline:'2px dashed #30334a'}:undefined} className={snapshot.painted[playerId].includes(cell) ? `is-painted paint-${colors[(cell + playerId) % colors.length]}` : ''} aria-hidden="true" />)}{snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Ready your colors!</span></div>}</div></div>)}</div>{recovery.pauseDialog}{snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Paint Splash results"><h2>Colorful work!</h2><ChallengeResult scores={snapshot.scores}/><div className="battle-results__scores">{players.map((id) => <p key={id}><strong>Player {id}</strong><span>{snapshot.coverage[id]}% painted</span></p>)}</div><button className="crayon-button crayon-button--primary" type="button" onClick={() => setSnapshot(model.start(performance.now()))}>Paint again</button></div>}</section>
}
