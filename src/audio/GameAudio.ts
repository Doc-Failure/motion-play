import { loadSettings, saveSettings } from '../app/localPreferences'

export type AudioTheme = 'default'|'dojo'|'fireworks'|'web'|'wash'|'beat'
export type Cue = 'shutter' | 'tag' | 'launch' | 'boom' | 'tick' | 'go' | 'score' | 'miss' | 'finish' | 'swoosh' | 'crack' | 'combo' | 'scrub' | 'bubble' | 'shine'
export const cueNotes: Record<Cue, number[]> = {
  shutter:[960,320], scrub:[640], bubble:[740,1100], shine:[523.25,659.25,783.99,1046.5,1567.98],
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

  play(cue: Cue, theme: AudioTheme = 'default') {
    if (!this.enabled || document.hidden) return
    this.unlock()
    if (!this.context || !this.master || this.context.state !== 'running') return
    const now = this.context.currentTime
    const action=cue==='score'||cue==='miss'||cue==='crack'||cue==='scrub'
    if (action && now - this.lastCue < .1) return
    if(action)this.lastCue = now
    if(cue==='shutter'){
      this.note(1050,now,.032,.38,'triangle',140)
      this.note(650,now+.065,.045,.25,'triangle',105)
      this.note(1046.5,now+.13,.14,.18,'sine')
      return
    }
    if(theme==='beat') {
      cueNotes[cue].forEach((f,i)=>this.note(f,now+i*.055,.16,.2,'triangle'))
      return
    }
    if(theme==='wash') {
      if(cue==='scrub'){this.soapNoise(now);this.note(560,now,.13,.12,'sine',980)}
      else if(cue==='bubble'){this.note(420,now,.09,.25,'sine',1400);this.note(1180,now+.04,.12,.09,'sine',740)}
      else cueNotes[cue].forEach((f,i)=>this.note(f,now+i*.065,cue==='shine'?.32:.2,.25,'triangle'))
      return
    }
    if(theme==='web'){if(cue==='swoosh')this.note(1500,now,.13,.35,'triangle',180);else cueNotes[cue].forEach((f,i)=>this.note(f*.8,now+i*.055,.2,.3,'triangle'));return}
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

  hoops(cue:'bounce'|'swish'|'miss',points=10) {
    if(!this.enabled||document.hidden)return
    this.unlock();if(!this.context||!this.master||this.context.state!=='running')return
    const now=this.context.currentTime
    if(now-this.lastCue<.08)return;this.lastCue=now
    if(cue==='bounce'){this.note(170,now,.14,.45,'sine',65);this.note(460,now,.045,.12,'triangle')}
    else if(cue==='swish'){this.soapNoise(now);[523.25,659.25,783.99].forEach((f,i)=>this.note(f*(points===30?1.25:1),now+i*.06,.25,.26,'triangle'))}
    else this.note(150,now,.13,.12,'sine',90)
  }

  music(step: number, theme: AudioTheme = 'default') {
    if (!this.enabled || document.hidden || !this.context || this.context.state !== 'running') return
    if(theme==='wash') {
      const now=this.context.currentTime,beat=step%16
      const tune=[659.25,0,783.99,0,880,783.99,0,659.25,587.33,0,659.25,0,523.25,0,587.33,0]
      if(tune[beat])this.note(tune[beat],now,.16,.075,'triangle')
      if(beat%4===0)this.note(beat%8===0?130.81:196,now,.22,.12,'sine')
      return
    }
    if(theme==='web'){const f=[196,0,293.66,0,261.63,392,0,293.66][step%8];if(f)this.note(f,this.context.currentTime,.19,.09,'triangle');return}
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

  /** Schedule the original 100 BPM accompaniment on the Web Audio clock. */
  rhythmStep(step:number,delaySeconds:number) {
    if(!this.enabled||document.hidden||!Number.isInteger(step)||step<0||!Number.isFinite(delaySeconds)||delaySeconds<0||delaySeconds>.2)return
    this.unlock();if(!this.context||!this.master||this.context.state!=='running')return
    const at=this.context.currentTime+delaySeconds,beat=step%16,bar=Math.floor(step/16),root=[146.83,123.47,98,110][bar%4]
    if(beat===0||beat===8)this.note(85,at,.14,.24,'sine',35)
    if(beat===4||beat===12){this.rhythmNoise(at,.09,.12,1700);this.note(180,at,.07,.08,'triangle',80)}
    if(beat%2===0)this.rhythmNoise(at,.035,.035,6500)
    if([0,6,8,14].includes(beat))this.note(root*(beat===6?1.5:1),at,.18,.14,'triangle')
    const tune=[2,0,4,0,7,0,4,0,9,0,7,0,4,0,2,0],semitone=tune[(beat+bar*2)%16]
    if(beat%2===0&&semitone)this.note(root*2*2**(semitone/12),at,.2,.065,'triangle')
  }
  rhythmStrike(pad:number,perfect:boolean) {
    if(!this.enabled||document.hidden)return
    this.unlock();if(!this.context||!this.master||this.context.state!=='running')return
    const at=this.context.currentTime
    if(pad===0)this.note(145,at,.22,.48,'sine',42)
    else if(pad===1){this.rhythmNoise(at,.12,.28,2200);this.note(230,at,.08,.12,'triangle',100)}
    else if(pad===2)this.note(587.33,at,.25,.28,'triangle')
    else {this.note(880,at,.27,.2,'sine');this.note(1174.66,at+.025,.25,.1,'sine')}
    if(perfect)this.note(1760,at+.018,.09,.035,'sine')
  }
  ufo(cue:'spin'|'launch'|'crash'|'overheat'|'save',streak=0) {
    if(!this.enabled||document.hidden)return
    this.unlock();if(!this.context||!this.master||this.context.state!=='running')return
    const t=this.context.currentTime
    if(cue==='spin'){this.note(180,t,.14,.055,'triangle',350);return}
    if(cue==='overheat'){this.rhythmNoise(t,.28,.09,1600);for(let i=0;i<3;i++)this.note(110-i*20,t+i*.08,.08,.08,'triangle');return}
    if(cue==='crash'){this.note(280,t,.35,.14,'sine',60);this.rhythmNoise(t+.15,.12,.09,700);return}
    const notes=cue==='save'?[440,880]:[330,440,660,880]
    notes.forEach((pitch,i)=>this.note(pitch*(cue==='launch'?2**(Math.min(4,Math.max(0,streak-1))/12):1),t+i*.075,.25,.09,'sine'))
    if(cue==='launch'){this.note(150,t,.5,.09,'triangle',1400);this.rhythmNoise(t,.35,.055,1100)}
  }
  ghost(cue:'pop'|'bat'|'escape'|'rub') {
    if(!this.enabled||document.hidden)return
    this.unlock();if(!this.context||!this.master||this.context.state!=='running')return
    const t=this.context.currentTime
    if(cue==='rub'){this.note(180,t,.12,.055,'sine',380);return}
    if(cue==='escape'){this.note(440,t,.32,.1,'sine',150);this.note(330,t+.12,.25,.07,'triangle',110);return}
    this.note(cue==='bat'?600:220,t,.13,.2,'sine',cue==='bat'?180:880)
    this.rhythmNoise(t+.04,.09,.12,1800)
    for(let i=0;i<3;i++)this.note([660,880,1320][i],t+.08+i*.06,.18,.075,'triangle')
  }
  football(cue:'bounce'|'header'|'bonus'|'drop',streak:number) {
    if(!this.enabled||document.hidden)return
    this.unlock();if(!this.context||!this.master||this.context.state!=='running')return
    const t=this.context.currentTime
    if(cue==='drop'){this.note(500,t,.18,.08,'sine',290);return}
    this.note(cue==='header'?190:130,t,.14,.22,'sine',55);this.rhythmNoise(t,.045,.12,900)
    if(cue==='bonus'||streak>0&&streak%5===0){
      this.rhythmNoise(t+.04,.65,.075,450)
      for(let i=0;i<4;i++){this.note(440*2**([0,4,7,12][i]/12),t+i*.09,.23,.09,'triangle');this.rhythmNoise(t+i*.13,.045,.07,1800)}
    }
  }
  boxing(cue:'hit'|'body'|'guard'|'windup'|'dodge'|'ouch'|'ko') {
    if(!this.enabled||document.hidden)return
    this.unlock();if(!this.context||!this.master||this.context.state!=='running')return
    const t=this.context.currentTime
    if(cue==='hit'||cue==='body'||cue==='ouch'){this.rhythmNoise(t,.09,.22,700);this.note(cue==='body'?100:170,t,.18,.3,'sine',45)}
    else if(cue==='windup'){this.note(160,t,.22,.12,'triangle',320);this.rhythmNoise(t+.55,.14,.13,2400)}
    else if(cue==='guard')this.note(300,t,.12,.12,'triangle',130)
    else if(cue==='dodge'){this.note(660,t,.12,.12);this.note(880,t+.09,.2,.12)}
    else for(let i=0;i<3;i++){this.note(660,t+i*.18,.5,.18);this.note(990,t+i*.18,.3,.07)}
  }
  private rhythmNoise(at:number,duration:number,volume:number,pitch:number){
    const context=this.context!
    if(typeof context.createBuffer!=='function')return
    const buffer=context.createBuffer(1,Math.floor(context.sampleRate*duration),context.sampleRate),data=buffer.getChannelData(0)
    let seed=3371;for(let i=0;i<data.length;i++){seed=seed*16807%2147483647;data[i]=seed/2147483647*2-1}
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain()
    source.buffer=buffer;filter.type='highpass';filter.frequency.value=pitch
    gain.gain.setValueAtTime(volume,at);gain.gain.exponentialRampToValueAtTime(.001,at+duration)
    source.connect(filter);filter.connect(gain);gain.connect(this.master!);this.voices.add(source)
    source.onended=()=>{this.voices.delete(source);source.disconnect();filter.disconnect();gain.disconnect()};source.start(at);source.stop(at+duration+.01)
  }

  private soapNoise(time:number) {
    const context=this.context!
    if(typeof context.createBuffer!=='function')return
    const duration=.15,buffer=context.createBuffer(1,Math.floor(context.sampleRate*duration),context.sampleRate),data=buffer.getChannelData(0)
    let seed=5171
    for(let i=0;i<data.length;i++){seed=seed*16807%2147483647;data[i]=(seed/2147483647*2-1)}
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain()
    source.buffer=buffer;filter.type='bandpass';filter.frequency.setValueAtTime(1100,time);filter.frequency.exponentialRampToValueAtTime(2400,time+duration)
    gain.gain.setValueAtTime(.001,time);gain.gain.linearRampToValueAtTime(.16,time+.025);gain.gain.exponentialRampToValueAtTime(.001,time+duration)
    source.connect(filter);filter.connect(gain);gain.connect(this.master!);this.voices.add(source)
    source.onended=()=>{this.voices.delete(source);source.disconnect();filter.disconnect();gain.disconnect()};source.start(time);source.stop(time+duration+.01)
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
