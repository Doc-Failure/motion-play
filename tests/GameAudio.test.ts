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

it('uses separate pitch-bent percussion and plucked tones for Paper Dojo',async () => {
  vi.resetModules()
  const voices:{type:string;frequency:{value:number;setValueAtTime:ReturnType<typeof vi.fn>;exponentialRampToValueAtTime:ReturnType<typeof vi.fn>};start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>}[]=[]
  class DojoContext {
    state='running';currentTime=5;destination={}
    createGain(){return {gain:{value:0,setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()}}
    createOscillator(){const voice={type:'',frequency:{value:0,setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn(),onended:null,start:vi.fn(),stop:vi.fn()};voices.push(voice);return voice}
  }
  vi.stubGlobal('AudioContext',DojoContext)
  const {gameAudio:fresh}=await import('../src/audio/GameAudio')
  fresh.setEnabled(true);fresh.play('crack','dojo');fresh.music(0,'dojo');fresh.music(2,'dojo')
  expect(voices.map(v=>v.type)).toEqual(['triangle','sine','triangle'])
  expect(voices[0].frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(650*.28,5.22)
  expect(voices[2].frequency.value).toBe(293.66)
  fresh.setEnabled(false)
  expect(voices.every(v=>v.stop.mock.calls.length===2)).toBe(true)
  vi.unstubAllGlobals()
})
