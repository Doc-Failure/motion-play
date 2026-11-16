import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GameFeedback } from '../src/game/GameFeedback'
import { gameAudio } from '../src/audio/GameAudio'
vi.mock('../src/audio/GameAudio', () => ({gameAudio:{enabled:true,play:vi.fn(),stop:vi.fn(),music:vi.fn(),unlock:vi.fn(),setEnabled:vi.fn()}}))
const state = {phase:'countdown',countdownRemainingMs:3000,roundRemainingMs:60000,scores:[{playerId:1,score:0}]}
describe('game feedback', () => {
  beforeEach(() => vi.clearAllMocks())
  it('plays countdown, go, distinct score and penalty cues, and the finish fanfare', () => {
    const {rerender} = render(<GameFeedback snapshot={state}/> )
    expect(gameAudio.play).toHaveBeenCalledWith('tick')
    rerender(<GameFeedback snapshot={{...state,phase:'playing'}}/> )
    expect(gameAudio.play).toHaveBeenCalledWith('go')
    rerender(<GameFeedback snapshot={{...state,phase:'playing',scores:[{playerId:1,score:10}]}}/> )
    expect(gameAudio.play).toHaveBeenCalledWith('score')
    expect(screen.getByText('P1 +10 ✦')).toBeInTheDocument()
    rerender(<GameFeedback snapshot={{...state,phase:'playing',scores:[{playerId:1,score:5}]}}/> )
    expect(gameAudio.play).toHaveBeenCalledWith('miss')
    rerender(<GameFeedback snapshot={{...state,phase:'results'}}/> )
    expect(gameAudio.play).toHaveBeenLastCalledWith('finish')
  })
  it('stops and restarts music with freeze cues without replaying round-start audio', () => {
    vi.useFakeTimers()
    try {
      const {rerender, unmount} = render(<GameFeedback snapshot={{...state,phase:'playing'}}/> )
      act(() => vi.advanceTimersByTime(300))
      expect(gameAudio.music).toHaveBeenCalledOnce()
      rerender(<GameFeedback snapshot={{...state,phase:'playing'}} musicPaused/> )
      expect(gameAudio.stop).toHaveBeenCalled()
      act(() => vi.advanceTimersByTime(1000))
      expect(gameAudio.music).toHaveBeenCalledOnce()
      rerender(<GameFeedback snapshot={{...state,phase:'playing'}}/> )
      act(() => vi.advanceTimersByTime(300))
      expect(gameAudio.music).toHaveBeenCalledTimes(2)
      expect(gameAudio.play).toHaveBeenCalledTimes(1)
      unmount()
    } finally { vi.useRealTimers() }
  })
  it('provides an accessible one-button sound toggle and stops audio on exit', () => {
    const {unmount} = render(<GameFeedback snapshot={state}/> )
    fireEvent.click(screen.getByRole('button',{name:'Mute game sound'}))
    expect(gameAudio.setEnabled).toHaveBeenCalledWith(false)
    expect(screen.getByRole('button',{name:'Enable game sound'})).toHaveAttribute('aria-pressed','true')
    unmount()
    expect(gameAudio.stop).toHaveBeenCalled()
  })
})
