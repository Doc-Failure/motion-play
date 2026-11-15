import { afterEach, describe, expect, it, vi } from 'vitest'
import { gameAudio } from '../src/audio/GameAudio'

describe('local audio synthesis', () => {
  afterEach(() => { gameAudio.stop(); vi.unstubAllGlobals() })
  it('builds envelopes, debounces rapid hits and stops active voices when muted', () => {
    const voices: {start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>}[] = []
    const gain = () => ({gain:{value:0,setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()})
    class MockContext {
      state = 'running'
      currentTime = 1
      destination = {}
      createGain = gain
      createOscillator() {
        const voice = {frequency:{value:0},type:'',connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null}
        voices.push(voice)
        return voice
      }
    }
    vi.stubGlobal('AudioContext',MockContext)
    gameAudio.setEnabled(true)
    gameAudio.play('score')
    expect(voices).toHaveLength(2)
    expect(voices.every(voice => voice.start.mock.calls.length === 1 && voice.stop.mock.calls.length === 1)).toBe(true)
    gameAudio.play('score')
    expect(voices).toHaveLength(2)
    gameAudio.setEnabled(false)
    expect(voices.every(voice => voice.stop.mock.calls.length === 2)).toBe(true)
    gameAudio.play('finish')
    expect(voices).toHaveLength(2)
    expect(JSON.parse(localStorage.getItem('motion-play:settings:v1')!).soundEnabled).toBe(false)
  })
})
