import { loadSettings, saveSettings } from '../app/localPreferences'

export type Cue = 'tag' | 'launch' | 'boom' | 'tick' | 'go' | 'score' | 'miss' | 'finish' | 'swoosh' | 'crack' | 'combo'
export const cueNotes: Record<Cue, number[]> = {
  tag:[880,1174.66], launch:[220,440], boom:[65,130],
  swoosh:[190,120], crack:[330,160], combo:[587.33,783.99,1174.66],
  tick: [440], go: [523.25, 659.25, 783.99], score: [783.99, 1046.5],
  miss: [220, 164.81], finish: [523.25, 659.25, 783.99, 1046.5],
}

// Original synthesized toy-piano sounds. No downloads, recording or network calls.
class GameAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private voices = new Set<AudioScheduledSourceNode>()
  private lastCue = -Infinity
  enabled = loadSettings().soundEnabled

  unlock = () => {
    if (!this.enabled || typeof AudioContext === 'undefined') return
    try {
      if (!this.context) {
        this.context = new AudioContext()
        this.master = this.context.createGain()
        this.master.gain.value = .16
        this.master.connect(this.context.destination)
      }
      if (this.context.state === 'suspended') void this.context.resume().catch(() => undefined)
    } catch { /* Audio is optional on browsers without an available output. */ }
  }

  setEnabled(value: boolean) {
    this.enabled = value
    saveSettings({ ...loadSettings(), soundEnabled: value })
    if (!value) this.stop()
    else this.unlock()
  }

  play(cue: Cue, theme: 'default'|'dojo'|'fireworks' = 'default') {
    if (!this.enabled || document.hidden) return
    this.unlock()
    if (!this.context || !this.master || this.context.state !== 'running') return
    const now = this.context.currentTime
    const action=cue==='score'||cue==='miss'||cue==='crack'
    if (action && now - this.lastCue < .1) return
    if(action)this.lastCue = now
    if(theme==='fireworks') {
      if(cue==='launch')this.note(180,now,.6,.25,'triangle',1200)
      else if(cue==='boom'){this.fireworkNoise(now);this.note(100,now,.5,.7,'sine',32);for(let i=0;i<6;i++)this.note(1800+i*260,now+i*.035,.35,.06,'triangle',500+i*70)}
      else cueNotes[cue].forEach((f,i)=>this.note(f,now+i*.065,.24,.28,'triangle'))
      return
    }
    if(theme==='dojo') {
      if(cue==='tick'||cue==='miss'||cue==='swoosh'||cue==='crack') {
        const pitch=cue==='tick'?180:cue==='miss'?90:cue==='crack'?650:330
        this.note(pitch,now,cue==='swoosh'?.16:.22,.65,'triangle',pitch*.28)
      } else cueNotes[cue].forEach((frequency,index)=>this.note(frequency*.75,now+index*.075,.25,.55,'triangle'))
      return
    }
    cueNotes[cue].forEach((frequency, index) => this.note(frequency, now + index * .09, cue === 'finish' ? .38 : .19, .7))
  }

  music(step: number, theme: 'default'|'dojo'|'fireworks' = 'default') {
    if (!this.enabled || document.hidden || !this.context || this.context.state !== 'running') return
    if(theme==='fireworks'){const tune=[523.25,0,783.99,0,659.25,0,1046.5,0,880,0,783.99,0,659.25,0,587.33,0];if(tune[step%16])this.note(tune[step%16],this.context.currentTime,.4,.07,'triangle');return}
    if(theme==='dojo') {
      const now=this.context.currentTime, beat=step%16
      if([0,6,8,14].includes(beat)) this.note(beat===0||beat===8?100:155,now,.18,.27,'sine',45)
      const melody:Record<number,number>={2:293.66,5:392,10:349.23,13:440}
      if(melody[beat])this.note(melody[beat],now,.22,.16,'triangle')
      return
    }
    const melody = [523.25, 0, 659.25, 783.99, 659.25, 0, 587.33, 0, 440, 0, 523.25, 659.25, 587.33, 0, 392, 0]
    const frequency = melody[step % melody.length]
    if (frequency) this.note(frequency, this.context.currentTime, .28, .12)
  }

  private fireworkNoise(time:number) {
    const context=this.context!
    if(typeof context.createBuffer!=='function')return
    const source=context.createBufferSource(),buffer=context.createBuffer(1,Math.floor(context.sampleRate*.55),context.sampleRate),data=buffer.getChannelData(0)
    let seed=9127
    for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=(seed/2147483647*2-1)}
    source.buffer=buffer
    const filter=context.createBiquadFilter(),gain=context.createGain();filter.type='lowpass';filter.frequency.setValueAtTime(3400,time);filter.frequency.exponentialRampToValueAtTime(350,time+.5)
    gain.gain.setValueAtTime(.18,time);gain.gain.exponentialRampToValueAtTime(.001,time+.55)
    source.connect(filter);filter.connect(gain);gain.connect(this.master!);this.voices.add(source)
    source.onended=()=>{this.voices.delete(source);source.disconnect();filter.disconnect();gain.disconnect()};source.start(time);source.stop(time+.56)
  }

  private note(frequency: number, time: number, duration: number, volume: number, wave: OscillatorType = 'sine', bend?: number) {
    const context = this.context!, oscillator = context.createOscillator(), envelope = context.createGain()
    oscillator.type = wave
    oscillator.frequency.value = frequency
    if(bend) {oscillator.frequency.setValueAtTime(frequency,time);oscillator.frequency.exponentialRampToValueAtTime(bend,time+duration)}
    envelope.gain.setValueAtTime(0, time)
    envelope.gain.linearRampToValueAtTime(volume, time + .008)
    envelope.gain.exponentialRampToValueAtTime(.001, time + duration)
    oscillator.connect(envelope); envelope.connect(this.master!)
    this.voices.add(oscillator)
    oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); envelope.disconnect() }
    oscillator.start(time); oscillator.stop(time + duration + .02)
  }

  stop() { this.voices.forEach(voice => { try { voice.stop() } catch { /* Already ended. */ } }); this.voices.clear() }
}
export const gameAudio = new GameAudio()
