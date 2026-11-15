import { loadSettings, saveSettings } from '../app/localPreferences'

export type Cue = 'tick' | 'go' | 'score' | 'miss' | 'finish' | 'swoosh' | 'crack' | 'combo'
export const cueNotes: Record<Cue, number[]> = {
  swoosh:[190,120], crack:[330,160], combo:[587.33,783.99,1174.66],
  tick: [440], go: [523.25, 659.25, 783.99], score: [783.99, 1046.5],
  miss: [220, 164.81], finish: [523.25, 659.25, 783.99, 1046.5],
}

// Original synthesized toy-piano sounds. No downloads, recording or network calls.
class GameAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private voices = new Set<OscillatorNode>()
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

  play(cue: Cue, theme: 'default'|'dojo' = 'default') {
    if (!this.enabled || document.hidden) return
    this.unlock()
    if (!this.context || !this.master || this.context.state !== 'running') return
    const now = this.context.currentTime
    const action=cue==='score'||cue==='miss'||cue==='crack'
    if (action && now - this.lastCue < .1) return
    if(action)this.lastCue = now
    if(theme==='dojo') {
      if(cue==='tick'||cue==='miss'||cue==='swoosh'||cue==='crack') {
        const pitch=cue==='tick'?180:cue==='miss'?90:cue==='crack'?650:330
        this.note(pitch,now,cue==='swoosh'?.16:.22,.65,'triangle',pitch*.28)
      } else cueNotes[cue].forEach((frequency,index)=>this.note(frequency*.75,now+index*.075,.25,.55,'triangle'))
      return
    }
    cueNotes[cue].forEach((frequency, index) => this.note(frequency, now + index * .09, cue === 'finish' ? .38 : .19, .7))
  }

  music(step: number, theme: 'default'|'dojo' = 'default') {
    if (!this.enabled || document.hidden || !this.context || this.context.state !== 'running') return
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
