// One timeline for the visual contact, sound and dodge judgement.
export const BOXING_WINDUP_MS=550,BOXING_STRIKE_MS=140
export const BOXING_CONTACT_MS=BOXING_WINDUP_MS+BOXING_STRIKE_MS
export const BOXING_ATTACK_END_MS=BOXING_CONTACT_MS+310
export function boxingAttack(age:number){
 if(age<0||age>=BOXING_ATTACK_END_MS)return {pull:0,reach:0}
 if(age<BOXING_WINDUP_MS)return {pull:Math.min(1,age/230),reach:0}
 if(age<BOXING_CONTACT_MS)return {pull:1,reach:((age-BOXING_WINDUP_MS)/BOXING_STRIKE_MS)**2}
 if(age<BOXING_CONTACT_MS+90)return {pull:1,reach:1}
 const retract=(age-BOXING_CONTACT_MS-90)/220
 return {pull:1-retract,reach:1-retract}
}
