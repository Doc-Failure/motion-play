import { loadSettings, saveSettings } from '../app/localPreferences'

export type Cue = 'tick' | 'go' | 'score' | 'miss' | 'finish'
export const cueNotes: Record<Cue, number[]> = {
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

  play(cue: Cue) {
    if (!this.enabled || document.hidden) return
    this.unlock()
    if (!this.context || !this.master || this.context.state !== 'running') return
    const now = this.context.currentTime
    if ((cue === 'score' || cue === 'miss') && now - this.lastCue < .1) return
    this.lastCue = now
    cueNotes[cue].forEach((frequency, index) => this.note(frequency, now + index * .09, cue === 'finish' ? .38 : .19, .7))
  }

  music(step: number) {
    if (!this.enabled || document.hidden || !this.context || this.context.state !== 'running') return
    const melody = [523.25, 0, 659.25, 783.99, 659.25, 0, 587.33, 0, 440, 0, 523.25, 659.25, 587.33, 0, 392, 0]
    const frequency = melody[step % melody.length]
    if (frequency) this.note(frequency, this.context.currentTime, .28, .12)
  }

  private note(frequency: number, time: number, duration: number, volume: number) {
    const context = this.context!, oscillator = context.createOscillator(), envelope = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
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
