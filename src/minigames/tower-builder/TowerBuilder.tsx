import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { GameFeedback } from '../../game/GameFeedback'
import { useRoundRecovery, type RoundRecoveryProps } from '../../game/useRoundRecovery'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { TowerBuilderModel, towerBlockWidth, type TowerBlock } from './TowerBuilderModel'
import './tower-builder.css'

export function TowerBuilder({ playerCount, inputEvents = [], onExit, externalPauseReason, onReconnect }: RoundRecoveryProps & {
  playerCount: PlayerCount; inputEvents?: MotionInputEvent[]; onExit(): void
}) {
  const [model] = useState(() => new TowerBuilderModel({ playerCount }))
  const [snapshot, setSnapshot] = useState(() => model.start(performance.now()))
  const controls = useRef(new Map<PlayerId, TowerBlock>())
  const [preview, setPreview] = useState<{ playerId: PlayerId; point: TowerBlock } | null>(null)
  const holding = useRef(new Set<PlayerId>())
  const results = useRef<HTMLHeadingElement>(null)
  const replay = useRef(false)
  const recovery = useRoundRecovery({ model, snapshot, setSnapshot, title: 'Tower Builder', externalPauseReason, onReconnect, onExit })
  useEffect(() => {
    let frame = 0
    const tick = (time: number) => {
      let next = model.update(time)
      if (next.phase === 'playing') for (const playerId of holding.current) {
        const point = controls.current.get(playerId)
        if (point) next = model.moveHand({ ...point, playerId, kind: 'HAND_POSITION', confidence: 1, timestamp: time })
      }
      setSnapshot(next)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [model])
  useEffect(() => { for (const event of inputEvents) setSnapshot(model.moveHand(event)) }, [inputEvents, model])
  useEffect(() => {
    holding.current.clear()
    if (snapshot.phase === 'results') { setPreview(null); results.current?.focus() }
    if (replay.current && snapshot.phase === 'countdown') {
      document.getElementById('tower-player-1')?.focus()
      replay.current = false
    }
  }, [snapshot.phase])
  const release = (playerId: PlayerId) => {
    holding.current.delete(playerId)
    setSnapshot(model.releaseHand(playerId))
  }
  const pointer = (playerId: PlayerId, event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const point = { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) }
    controls.current.set(playerId, point)
    setPreview(current => current?.playerId === playerId ? { playerId, point } : current)
  }
  const keyboard = (playerId: PlayerId, event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(event.key)) return
    event.preventDefault()
    const point = controls.current.get(playerId) ?? { x: .5, y: .82 }
    controls.current.set(playerId, { x: Math.max(0, Math.min(1, point.x + (event.key === 'ArrowLeft' ? -.025 : event.key === 'ArrowRight' ? .025 : 0))),
      y: Math.max(0, Math.min(1, point.y + (event.key === 'ArrowUp' ? -.03 : event.key === 'ArrowDown' ? .03 : 0))) })
    setPreview({ playerId, point: controls.current.get(playerId)! })
    if (event.key === ' ' || event.key === 'Enter') holding.current.add(playerId)
  }
  const block = (point: TowerBlock | null, className: string, key?: number) => point && <svg key={key} className={`tower-block ${className}`} style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%`, width: `${towerBlockWidth * 100}%` }} viewBox="0 0 120 32" preserveAspectRatio="none" aria-hidden="true"><path d="M4 4 114 2 118 28 2 30Z"/><path d="m12 12 94-3M10 22l99-3"/></svg>
  return <section className="tower-game" aria-labelledby="tower-title"><GameFeedback snapshot={snapshot}/>
    <header className="bubble-game__header"><h1 id="tower-title">Tower Builder</h1><dl><div><dt>Team</dt><dd>{snapshot.teamScore} points</dd></div><div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>{recovery.pauseButton}<button className="text-button" onClick={onExit}>Exit game</button></header>
    <p className="tower-rules">Together, stack six blocks! Hold steady in the outline for 0.8s: +10 each, +30 per tower. Off balance? Rebuild with your points safe.</p>
    <div className="tower-boards" style={{ gridTemplateColumns: `repeat(${playerCount}, minmax(0, 1fr))` }}>{snapshot.lanes.map(lane => <section key={lane.playerId} className={`tower-player tower-player--${lane.playerId}`} aria-label={`Player ${lane.playerId}`}>
      <h2>Player {lane.playerId}<span>{snapshot.scores[lane.playerId - 1].score} contributed · {lane.placed} blocks · {lane.completed} towers</span></h2>
      <div id={`tower-player-${lane.playerId}`} className="tower-board" role="group" tabIndex={0} aria-label={`Player ${lane.playerId} Tower Builder play area`} aria-describedby="tower-help"
        onPointerMove={event => pointer(lane.playerId, event)} onPointerDown={event => { pointer(lane.playerId, event); event.currentTarget.setPointerCapture?.(event.pointerId); holding.current.add(lane.playerId); event.currentTarget.focus() }}
        onPointerUp={() => release(lane.playerId)} onPointerCancel={() => release(lane.playerId)} onLostPointerCapture={() => release(lane.playerId)}
        onFocus={() => { const point = controls.current.get(lane.playerId) ?? { x: .5, y: .82 }; controls.current.set(lane.playerId, point); setPreview({ playerId: lane.playerId, point }) }}
        onBlur={() => { setPreview(null); release(lane.playerId) }} onKeyDown={event => keyboard(lane.playerId, event)} onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') release(lane.playerId) }}>
        {lane.blocks.map((point, index) => block(point, 'tower-block--placed', index))}
        {block(lane.target, 'tower-block--target')}
        {block(lane.hand ?? (preview?.playerId === lane.playerId && snapshot.phase === 'playing' ? preview.point : null), 'tower-block--hand')}
        <progress className="tower-progress" value={lane.progress} max={1} aria-label={`Player ${lane.playerId} steady hold`}/>
        {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Steady hands, happy towers!</span></div>}
      </div><p role="status" className="tower-feedback" aria-label={`Player ${lane.playerId} building feedback`}>{lane.feedback}</p>
    </section>)}</div>
    <p id="tower-help" className="tower-help">Simulation: hold the mouse or touch down on the outline. Keyboard: focus your lane, use arrows, then hold Space or Enter. Camera motion centroids are not tracked hands; stable webcam control is unverified.</p>
    {recovery.pauseDialog}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Tower Builder results"><h2 ref={results} tabIndex={-1}>Teamwork builds wonders!</h2><p>Team: {snapshot.teamScore} points</p>{snapshot.lanes.map(lane => <p key={lane.playerId}>Player {lane.playerId}: {lane.placed} blocks · {lane.completed} towers · {lane.topples} topples</p>)}<button className="crayon-button" onClick={() => { controls.current.clear(); holding.current.clear(); replay.current = true; setSnapshot(model.start(performance.now())) }}>Play again</button><button className="text-button" onClick={onExit}>Back to setup</button></div>}
  </section>
}
