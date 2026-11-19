import {expect,it} from 'vitest'
import {boxingAttack,BOXING_CONTACT_MS,BOXING_ATTACK_END_MS} from '../src/minigames/boxing-champ/boxingAttack'
import {BoxingModel} from '../src/minigames/boxing-champ/BoxingModel'
import {boxerPose} from '../src/minigames/boxing-champ/boxerPose'
it('selects guard, attack, hit and knockout poses from boxer state',()=>{
 const boxer=new BoxingModel(1).start(0).boxers[0]
 expect(boxerPose(boxer,0)).toBe(0)
 expect(boxerPose({...boxer,attack:100},300)).toBe(1)
 expect(boxerPose({...boxer,cue:'hit',cueAt:100},300)).toBe(2)
 expect(boxerPose({...boxer,health:0},300)).toBe(3)
})
it('pulls back, holds a readable warning, then accelerates to contact in 140ms',()=>{
 expect(boxingAttack(-1)).toEqual({pull:0,reach:0})
 expect(boxingAttack(230)).toEqual({pull:1,reach:0})
 expect(boxingAttack(550).reach).toBe(0)
 expect(boxingAttack(620).reach).toBe(.25)
 expect(boxingAttack(BOXING_CONTACT_MS)).toEqual({pull:1,reach:1})
 expect(boxingAttack(BOXING_CONTACT_MS+80).reach).toBe(1)
})
it('retracts continuously to the resting glove without a contact-frame teleport',()=>{
 expect(boxingAttack(779).reach).toBe(1)
 expect(boxingAttack(780).reach).toBe(1)
 expect(boxingAttack(890)).toEqual({pull:.5,reach:.5})
 expect(boxingAttack(BOXING_ATTACK_END_MS)).toEqual({pull:0,reach:0})
})
