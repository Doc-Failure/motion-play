import {describe,it,expect} from 'vitest'
import {BoxingModel} from '../src/minigames/boxing-champ/BoxingModel'
import {boxingInput} from '../src/input/BoxingInput'
import type {MotionInputEvent} from '../src/input/MotionProcessor'
import type {StickBody} from '../src/camera/poseTracking'
const hand=(timestamp:number,x=.66,y=.35,extra:Partial<MotionInputEvent>={}):MotionInputEvent=>({playerId:1,kind:'HAND_POSITION',x,y,timestamp,confidence:1,pointerId:'15',...extra})
const punch=(m:BoxingModel,t:number,y=.35)=>{m.input(hand(t-80,.4,y));return m.input(hand(t,.66,y))}
const game=()=>{const m=new BoxingModel(2);m.start(0);m.update(3000);return m}
describe('Cardboard Champ',()=>{
 it('scores real wrist travel on the opponent, with player isolation and distinct body hits',()=>{const m=game();expect(punch(m,3200).scores.map(s=>s.score)).toEqual([10,0]);expect(punch(m,3600,.57).boxers[0]).toMatchObject({health:65,combo:2,cue:'body'});expect(m.update(3600).scores[0].score).toBe(19)})
 it('does not score stationary hands, frame motion, or a first pose sample',()=>{const m=game();m.input(hand(3100));m.input(hand(3200));m.input(hand(3300,.66,.35,{kind:'MOTION_HIT'}));expect(m.update(3300).scores[0].score).toBe(0)})
 it('rejects jitter, missing-confidence samples, duplicate samples and stale tracking',()=>{const m=game();m.input(hand(3100,.65));m.input(hand(3200));m.input(hand(3250,.4));m.input(hand(3300,.66,.35,{confidence:.2}));m.input(hand(5000));expect(m.update(5000).scores[0].score).toBe(0);const hit=punch(m,5400);expect(hit.scores[0].score).toBe(10);m.input(hand(5400));expect(m.update(5500).scores[0].score).toBe(10)})
 it('guards high shots during a windup but allows body punches',()=>{const m=game();m.update(6500);expect(punch(m,6700).boxers[0].cue).toBe('guard');expect(punch(m,7050,.57).scores[0].score).toBe(8)})
 it('uses a recent measured head for dodges; missing tracking cannot earn a dodge',()=>{const m=game();m.update(6500);m.input(hand(7150,.5,.65,{kind:'BODY_MOVE'}));const s=m.update(7190);expect(s.scores.map(x=>x.score)).toEqual([15,0]);expect(s.boxers[0].cue).toBe('dodge');expect(s.boxers[1].stamina).toBe(100)})
 it('only damages a player still inside the signalled punch region',()=>{const m=game();m.update(6500);m.input(hand(7150,.5,.35,{kind:'BODY_MOVE'}));const s=m.update(7190);expect(s.boxers[0].stamina).toBe(75);expect(s.boxers[0].cue).toBe('ouch');expect(s.boxers[1].stamina).toBe(100)})
 it('ignores an old head position rather than rewarding an imaginary dodge',()=>{const m=game();m.input(hand(6100,.5,.8,{kind:'BODY_MOVE'}));m.update(6500);expect(m.update(7190).scores[0].score).toBe(0)})
 it('knocks out, awards a bonus once, then brings the opponent back',()=>{const m=game();let s=punch(m,3200);for(const t of [3600,4000,4400,4800])s=punch(m,t);expect(s.boxers[0]).toMatchObject({health:0,kos:1,cue:'ko'});expect(s.scores[0].score).toBe(110);expect(punch(m,5200).scores[0].score).toBe(110);expect(m.update(6600).boxers[0].health).toBe(100)})
 it('pauses the attack clock and clears pre-pause gestures',()=>{const m=game();m.update(6500);m.pause(7000);expect(punch(m,8000).scores[0].score).toBe(0);m.resume(10000);expect(m.input(hand(10030)).scores[0].score).toBe(0);expect(m.update(10189).boxers[0].resolved).toBe(false);expect(m.update(10190).boxers[0].resolved).toBe(true)})
 it('finishes after sixty active seconds and resets for replay',()=>{const m=game();punch(m,3200);expect(m.update(63000).phase).toBe('results');expect(punch(m,64000).scores[0].score).toBe(10);const s=m.start(65000);expect(s.phase).toBe('countdown');expect(s.scores[0].score).toBe(0);expect(s.boxers[0].health).toBe(100)})
 it('never joins strokes across countdown or between separate wrists',()=>{const m=new BoxingModel(1);m.start(0);m.input(hand(2990,.4));m.input(hand(3070));m.input(hand(3200,.4));m.input(hand(3280,.66,.35,{pointerId:'16'}));expect(m.update(3300).scores[0].score).toBe(0)})
})
it('maps measured mirrored wrists/head into each lane without shifting aim, and rejects ambiguous bodies',()=>{
 const body:StickBody={neck:{x:.7,y:.3},head:{x:.72,y:.2},hands:[{x:.8,y:.4,visibility:.9}],wristIds:[15],headRadius:.03,torso:[],arms:[],legs:[],x:.7}
 expect(boxingInput([body],2,100)[0]).toMatchObject({playerId:2,x:.6000000000000001,y:.4,kind:'HAND_POSITION',pointerId:'15'})
 expect(boxingInput([body],2,100)[1]).toMatchObject({playerId:2,y:.2,kind:'BODY_MOVE'})
 expect(boxingInput([body,body],2,100)).toEqual([])
})

it('matches the wider robot proportions and centered hit areas in narrow multiplayer lanes',()=>{
 const m=new BoxingModel(4,1/3);m.start(0);m.update(3000)
 m.input(hand(3100,.1));const hit=m.input(hand(3180,.5))
 expect(hit.scores.map(s=>s.score)).toEqual([10,0,0,0])
 m.setAspectRatio(4/3);m.input(hand(3500,.1));expect(m.input(hand(3580,.4)).scores[0].score).toBe(10)
})

it('judges a punch at visual contact once, after the shortened warning',()=>{
 const m=game();m.update(6500);m.input(hand(7150,.5,.35,{kind:'BODY_MOVE'}))
 expect(m.update(7189).boxers[0].stamina).toBe(100)
 expect(m.update(7190).boxers[0].stamina).toBe(75)
 expect(m.update(7300).boxers[0].stamina).toBe(75)
 expect(m.update(9999).boxers[0].attack).toBe(3500)
 expect(m.update(10000).boxers[0].attack).toBe(7000)
})

it('awards the dodge counter once within the recovery window',()=>{
 const m=game();m.update(6500);m.input(hand(7150,.5,.65,{kind:'BODY_MOVE'}));m.update(7190)
 const counter=punch(m,7350)
 expect(counter.boxers[0].cue).toBe('counter');expect(counter.scores[0].score).toBe(37)
 expect(punch(m,7700).scores[0].score).toBe(48)
})
