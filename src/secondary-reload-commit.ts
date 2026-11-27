import {exchangeUnifiedMagazine} from './equipment-unified-deployed.ts';
/** S8.4 ONE fixed-step application of an already timed magazine exchange.
 * Shared by authored RELOAD and the explicit live reload button / emergency.
 * The pure exchange owns identities and round conservation; this adapter owns
 * only the actor's physical inventory and existing world drop journal.
 */
import type {Session,TeamActor} from './breach-game.ts';
import type {SecondaryReloadStep} from './secondary-timed-reload.ts';

export function commitSecondaryReloadStep(s:Session,a:TeamActor,
 result:SecondaryReloadStep):boolean{
 if(!result.ok)return false;
 const current=a.equipment?.secondary;
 if(a.unifiedCarry&&result.insertedNow){
  const incoming=result.equipment.loadedMagazineId,old=current?.loadedMagazineId;
  if(!incoming||!old)return false;
  const next=exchangeUnifiedMagazine(a.unifiedCarry,incoming,result.dropped?null:old);
  if(!next)return false;
  a.unifiedCarry=next;
 }
 if(result.equipment!==current&&a.equipment){
  a.equipment={...a.equipment,secondary:result.equipment};
 }
 if(!result.dropped)return true;
 s.dropped.push({id:s.nextEffectId++,p:{...a.p},
  side:a.side,age:0,weapon:'smg',
  secondaryWeapon:result.equipment.weapon!,
  magazineId:result.dropped.id,rounds:result.dropped.rounds});
 if(s.dropped.length>48)s.dropped.shift();
 return true;
}
