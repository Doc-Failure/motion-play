import { useEffect, useMemo, useRef, useState } from 'react'
import { gameAudio } from '../../audio/GameAudio'
import { scoreGoal } from '../../game/arcade'
import { ChallengeResult } from '../../game/ArcadeRound'
import { useChallenge } from '../../game/ChallengeContext'
import { RoundHud } from '../../game/RoundHud'
import { useRoundRecovery, type RoundRecoveryProps } from '../../game/useRoundRecovery'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount } from '../../input/PlayerZoneMapper'
import { JengaRound } from './JengaRound'
import { towerBlocks } from './TowerGeometry'

type Props = RoundRecoveryProps & { playerCount: PlayerCount; aspect: number; inputEvents: MotionInputEvent[]; onExit(): void }

const names = ['left', 'middle', 'right']

const points = (face: number[][]) => face.map(([x,y]) => `${x*1000},${y*1000}`).join(' ')

function WoodBlock({ block, selected }: { block: ReturnType<typeof towerBlocks>[number]; selected: boolean }) {
  const { left, right, lid, cross, wood, endCentre } = block
  const side = cross ? right : left
  const grain = (along: number, up: number) => {
    const [a, b] = cross ? [side[0], side[1]] : [side[0], side[3]]
    const top = cross ? side[3] : side[1]
    return `${(a[0] + (b[0]-a[0])*along)*1000},${(a[1] + (b[1]-a[1])*along + (top[1]-a[1])*up)*1000}`
  }
  return <g stroke={selected ? '#186462' : '#503c32'} strokeWidth={selected ? 3.5 : 2} strokeLinejoin="round" strokeDasharray={wood ? undefined : '5 3'}>
    <polygon points={points(left)} fill={wood ? cross ? '#eab675' : '#d5a26e' : '#f5e7c3'}/>
    <polygon points={points(right)} fill={wood ? cross ? '#e5b680' : '#f6cc8d' : '#fff4cd'}/>
    <polygon points={points(lid)} fill={selected ? '#ffdb67' : wood ? '#ffe4b1' : '#fff9dc'}/>
    {wood ? <path d={`M${grain(.08,.28)} Q${grain(.31,.42)} ${grain(.46,.33)} T${grain(.90,.38)} M${grain(.36,.68)} Q${grain(.56,.57)} ${grain(.70,.66)}`}
      stroke="#9c693e" fill="none" strokeWidth="1.7" strokeLinecap="round"/>
      : <text x={endCentre[0]*1000} y={endCentre[1]*1000} textAnchor="middle" dominantBaseline="central" fill="#473a32" stroke="none" fontSize="30">+</text>}
  </g>
}

export function Jenga({ playerCount, aspect, inputEvents, onExit, externalPauseReason, onReconnect }: Props) {
  const challenge = useChallenge()
  const pressure = challenge?.pressure ?? 0
  const [model] = useState(() => new JengaRound(playerCount, pressure))
  const [snap, setSnap] = useState(() => model.start(performance.now()))
  const recovery = useRoundRecovery({ model, snapshot: snap, setSnapshot: setSnap, title: 'Jenga', externalPauseReason, onReconnect, onExit })
  const laneAspect = aspect / playerCount
  useEffect(() => { model.input(inputEvents, laneAspect, performance.now()) }, [inputEvents, model, laneAspect])
  useEffect(() => {
    if (snap.phase === 'paused' || snap.phase === 'results') return
    const timer = window.setInterval(() => setSnap(model.update(performance.now())), 40)
    return () => window.clearInterval(timer)
  }, [model, snap.phase])
  const placing = snap.holding && snap.phase !== 'results'
  const blocks = useMemo(() => towerBlocks(snap.tower, placing, laneAspect), [snap.tower, placing, laneAspect])
  const turn = playerCount > 1 ? `P${snap.player} · ` : ''
  const moves = snap.scores.reduce((sum, p) => sum + p.score, 0)
  const previousMoves = useRef(0)
  useEffect(() => {
    if (snap.fallen) gameAudio.play('crack')
    else if (moves > previousMoves.current) gameAudio.play('score')
    previousMoves.current = moves
  }, [moves, snap.fallen])
  const cue = snap.holding ? 'Choose a top slot' : snap.locked ? 'Pull sideways!' : 'Pick a lower block'
  return <section className="jenga-game" aria-label="Jenga" data-phase={snap.phase}>
    <RoundHud title="Jenga" snapshot={snap} onExit={onExit} exitRef={recovery.exitButtonRef}/>
    <div className="jenga-boards">{snap.scores.map(({ playerId }) => <section key={playerId}>
      {playerId === snap.player && <>
        <h2 aria-live="polite">{turn}{cue}{challenge && <small style={{display:'block'}}>
          Level {challenge.level} · Stack {moves}/{scoreGoal('jenga', challenge.level)}
        </small>}</h2>
        <div role="group" aria-label={`Player ${playerId} Jenga play area`}>
          <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 84%', transform: snap.fallen ? 'rotate(22deg)' : undefined }}>
            <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" width="100%" height="100%">
              {blocks.map(block => {
                const { row, column, wood } = block
                const enabled = model.available(block) && snap.phase === 'playing'
                const targeted = snap.target?.row === row && snap.target.column === column
                const act = () => { const now = performance.now(); model.move(block, playerId, now); setSnap(model.update(now)) }
                return <g key={row * 3 + column} role="button" aria-disabled={!enabled} tabIndex={enabled ? 0 : -1}
                  aria-label={`${wood ? 'Pull' : 'Place'} ${names[column]} block, row ${row + 1}`}
                  style={{cursor:enabled ? 'pointer' : 'default'}}
                  onClick={() => { if (enabled) act() }}
                  onKeyDown={e => {
                    if (enabled && !e.repeat && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); act() }
                  }}>
                  <WoodBlock block={block} selected={targeted}/>
                </g>
              })}
            </svg>
          </div>
          {snap.hand && <span aria-hidden="true" style={{ position: 'absolute', pointerEvents: 'none',
            left: snap.hand.x * 100 + '%', top: snap.hand.y * 100 + '%', transform: 'translate(-50%, -50%)',
            width: 21, height: 21, borderRadius: '50%', border: '3px solid #302e38', boxShadow: '0 0 0 2px white',
            background: `conic-gradient(#ffa832 ${snap.progress * 360}deg, #fff9 0)` }}/>}
        </div>
      </>}
    </section>)}</div>
    {snap.phase === 'playing' && <p>{snap.holding ? 'Hold over a + to stack, or click it.' : 'Hold on a block and slide sideways, or click a block. Keep the middle supported!'}</p>}
    {snap.phase === 'countdown' && <div className="game-curtain"><strong>{Math.ceil(snap.countdownRemainingMs / 1000)}</strong></div>}
    {recovery.pauseDialog}
    {snap.phase === 'results' && <div role="dialog" aria-label="Jenga results" className="battle-results">
      <h2 ref={recovery.resultsHeading} tabIndex={-1}>{snap.fallen ? 'Timber!' : 'Time’s up!'}</h2>
      <p>{moves} {moves === 1 ? 'block' : 'blocks'} safely stacked</p>
      <ChallengeResult scores={snap.scores}/>
      <div className="result-actions"><button className="crayon-button" onClick={() => setSnap(model.start(performance.now()))}>Play again</button>
        <button className="crayon-button" onClick={onExit}>Back to games</button></div>
    </div>}
  </section>
}
