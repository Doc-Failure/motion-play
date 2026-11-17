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


it('synthesizes an original web cast, capture chime and quiet groove with mute cleanup',async()=>{
  vi.resetModules()
  const voices:{frequency:{value:number;setValueAtTime:ReturnType<typeof vi.fn>;exponentialRampToValueAtTime:ReturnType<typeof vi.fn>};stop:ReturnType<typeof vi.fn>}[]=[]
  class WebContext {
    state='running';currentTime=10;destination={}
    createGain(){return {gain:{value:0,setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()}}
    createOscillator(){const voice={type:'',frequency:{value:0,setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn(),onended:null,start:vi.fn(),stop:vi.fn()};voices.push(voice);return voice}
  }
  vi.stubGlobal('AudioContext',WebContext)
  const {gameAudio:fresh}=await import('../src/audio/GameAudio')
  try {
    fresh.setEnabled(true);fresh.play('swoosh','web');fresh.play('tag','web');fresh.music(0,'web')
    expect(voices).toHaveLength(4)
    expect(voices[0].frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(180,10.13)
    fresh.setEnabled(false)
    expect(voices.every(v=>v.stop.mock.calls.length===2)).toBe(true)
  } finally {fresh.stop();vi.unstubAllGlobals()}
})

it('gives washing its own filtered swish, rising bubble pop and sparkle fanfare, and stops every voice',async()=>{
 vi.resetModules()
 const voices:{type?:string;stop:ReturnType<typeof vi.fn>;start:ReturnType<typeof vi.fn>;frequency?:{value:number;setValueAtTime:ReturnType<typeof vi.fn>;exponentialRampToValueAtTime:ReturnType<typeof vi.fn>}}[]=[],filters:{type:string}[]=[]
 class WashContext {
  state='running';currentTime=20;sampleRate=48000;destination={}
  createGain(){return {gain:{value:0,setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()}}
  createOscillator(){const voice={type:'',frequency:{value:0,setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null};voices.push(voice);return voice}
  createBuffer(_channels:number,size:number){return {getChannelData:()=>new Float32Array(size)}}
  createBufferSource(){const voice={buffer:null,connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null};voices.push(voice);return voice}
  createBiquadFilter(){const filter={type:'',frequency:{setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()};filters.push(filter);return filter}
 }
 vi.stubGlobal('AudioContext',WashContext)
 const {gameAudio:fresh}=await import('../src/audio/GameAudio')
 try {
  fresh.setEnabled(true);fresh.play('scrub','wash')
  expect(filters[0].type).toBe('bandpass');expect(voices).toHaveLength(2)
  fresh.play('scrub','wash');expect(voices).toHaveLength(2)
  fresh.play('bubble','wash');expect(voices[2].frequency?.exponentialRampToValueAtTime).toHaveBeenCalledWith(1400,20.09)
  fresh.play('shine','wash');expect(voices).toHaveLength(9)
  fresh.music(0,'wash');expect(voices).toHaveLength(11)
  fresh.setEnabled(false);expect(voices.every(v=>v.stop.mock.calls.length===2)).toBe(true)
 } finally {fresh.stop();vi.unstubAllGlobals()}
})

it('schedules rhythm subdivisions ahead, adds distinct strike instruments and cancels future voices on mute',async()=>{
 vi.resetModules()
 const voices:{start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>;type?:string}[]=[]
 class RhythmContext {
  state='running';currentTime=30;sampleRate=48000;destination={}
  createGain(){return {gain:{value:0,setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()}}
  createOscillator(){const voice={type:'',frequency:{value:0,setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn(),onended:null,start:vi.fn(),stop:vi.fn()};voices.push(voice);return voice}
  createBuffer(_channels:number,size:number){return {getChannelData:()=>new Float32Array(size)}}
  createBufferSource(){const voice={buffer:null,connect:vi.fn(),disconnect:vi.fn(),onended:null,start:vi.fn(),stop:vi.fn()};voices.push(voice);return voice}
  createBiquadFilter(){return {type:'',frequency:{value:0},connect:vi.fn(),disconnect:vi.fn()}}
 }
 vi.stubGlobal('AudioContext',RhythmContext)
 const {gameAudio:fresh}=await import('../src/audio/GameAudio')
 try{
  fresh.setEnabled(true);fresh.rhythmStep(0,.12)
  expect(voices.length).toBeGreaterThan(2);expect(voices.every(v=>v.start.mock.calls[0][0]===30.12)).toBe(true)
  const background=voices.length;for(let pad=0;pad<4;pad++)fresh.rhythmStrike(pad,true)
  expect(voices.length).toBeGreaterThan(background+4)
  const before=voices.length;fresh.rhythmStep(3,NaN);fresh.rhythmStep(3,-1);expect(voices).toHaveLength(before)
  fresh.setEnabled(false);expect(voices.every(v=>v.stop.mock.calls.length===2)).toBe(true)
 }finally{fresh.stop();vi.unstubAllGlobals()}
})

it('gives boxing body hits, windups and knockouts distinct voices and respects mute',async()=>{
 vi.resetModules()
 const pitches:number[]=[],stops:ReturnType<typeof vi.fn>[]=[]
 class BoxingContext {
  state='running';currentTime=1;destination={}
  createGain(){return {gain:{value:0,setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()}}
  createOscillator(){const stop=vi.fn();stops.push(stop);return {frequency:{set value(v:number){pitches.push(v)},get value(){return 0},setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},type:'',connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop,onended:null}}
 }
 vi.stubGlobal('AudioContext',BoxingContext)
 const {gameAudio:audio}=await import('../src/audio/GameAudio')
 audio.setEnabled(true);audio.boxing('body');audio.boxing('windup');audio.boxing('ko')
 expect(pitches).toContain(100);expect(pitches).toContain(160);expect(pitches.filter(p=>p===660)).toHaveLength(3)
 audio.setEnabled(false);const count=pitches.length;audio.boxing('hit');expect(pitches).toHaveLength(count)
 expect(stops.every(stop=>stop.mock.calls.length>=2)).toBe(true)
 audio.stop();vi.unstubAllGlobals()
})

it('adds a rising crowd celebration to football streaks and respects mute',async()=>{
 vi.resetModules();const pitches:number[]=[],stops:ReturnType<typeof vi.fn>[]=[]
 class FootballContext {
  state='running';currentTime=1;destination={}
  createGain(){return {gain:{value:0,setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()}}
  createOscillator(){const stop=vi.fn();stops.push(stop);return {frequency:{set value(v:number){pitches.push(v)},get value(){return 0},setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},type:'',connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop,onended:null}}
 }
 vi.stubGlobal('AudioContext',FootballContext);const {gameAudio:audio}=await import('../src/audio/GameAudio')
 audio.setEnabled(true);audio.football('header',4);expect(pitches).toEqual([190]);audio.football('header',5);expect(pitches).toHaveLength(6);expect(pitches.at(-1)).toBe(880)
 audio.setEnabled(false);audio.football('bonus',5);expect(pitches).toHaveLength(6);expect(stops.every(stop=>stop.mock.calls.length>=2)).toBe(true)
 audio.stop();vi.unstubAllGlobals()
})

it('gives ghost captures and escapes distinct envelopes and cancels voices on mute',async()=>{
 vi.resetModules();const pitches:number[]=[],stops:ReturnType<typeof vi.fn>[]=[]
 class FootballContext {
  state='running';currentTime=1;destination={}
  createGain(){return {gain:{value:0,setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()}}
  createOscillator(){const stop=vi.fn();stops.push(stop);return {frequency:{set value(v:number){pitches.push(v)},get value(){return 0},setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},type:'',connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop,onended:null}}
 }
 vi.stubGlobal('AudioContext',FootballContext);const {gameAudio:audio}=await import('../src/audio/GameAudio')
 audio.setEnabled(true);audio.ghost('pop');audio.ghost('escape');audio.ghost('rub');expect(pitches).toEqual([220,660,880,1320,440,330,180])
 audio.setEnabled(false);audio.ghost('bat');expect(pitches).toHaveLength(7);expect(stops.every(stop=>stop.mock.calls.length>=2)).toBe(true)
 audio.stop();vi.unstubAllGlobals()
})

it('gives UFO engines, launches and crashes distinct pitches and respects mute',async()=>{
 vi.resetModules();const pitches:number[]=[],stops:ReturnType<typeof vi.fn>[]=[]
 class FootballContext {
  state='running';currentTime=1;destination={}
  createGain(){return {gain:{value:0,setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()}}
  createOscillator(){const stop=vi.fn();stops.push(stop);return {frequency:{set value(v:number){pitches.push(v)},get value(){return 0},setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},type:'',connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop,onended:null}}
 }
 vi.stubGlobal('AudioContext',FootballContext);const {gameAudio:audio}=await import('../src/audio/GameAudio')
 audio.setEnabled(true);audio.ufo('spin');audio.ufo('launch');audio.ufo('crash');expect(pitches).toEqual([180,330,440,660,880,150,280]);audio.ufo('launch',3);expect(pitches[7]).toBeGreaterThan(330)
 audio.setEnabled(false);audio.ufo('overheat');expect(pitches).toHaveLength(12);expect(stops.every(stop=>stop.mock.calls.length>=2)).toBe(true)
 audio.stop();vi.unstubAllGlobals()
})
