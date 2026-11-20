/** S8.1: pure, identity-conserving handgun magazine exchange.
 * Timing, hand motion and battle events belong to the tactical fixed step.
 * This function is the ONE atomic inventory handoff at insertion. It never
 * invents a spare, fills a magazine, or borrows the primary reserve counter.
 */
import {secondaryRoundTotal,type SecondaryEquipment,type SecondaryMagazine}
 from './secondary-equipment.ts';

export type SecondaryExchangeResult=Readonly<{
 ok:boolean;
 equipment:SecondaryEquipment;
 /** Physically dropped old magazine (including zero-round emergency mags). */
 dropped:SecondaryMagazine|null;
 selectedId:string|null;
 reason?:string;
}>;
/** `retain` means a tactical reload: preserve the old loaded magazine and
 * its remaining rounds in the EXACT carrier location emptied by the incoming
 * spare. Emergency reloads drop that magazine into an explicit event instead.
 * Both operations use already-issued identities, no generated IDs.
 */
export function exchangeSecondaryMagazine(equipment:SecondaryEquipment,
 selectedId:string,retain:boolean):SecondaryExchangeResult{
 const reject=(reason:string):SecondaryExchangeResult=>({
  ok:false,equipment,dropped:null,selectedId:null,reason});
 if(!equipment.weapon||!equipment.loadedMagazineId)
  return reject('NO SECONDARY MAGAZINE');
 const oldId=equipment.loadedMagazineId;
 const index=equipment.spareMagazines.findIndex(m=>m.id===selectedId);
 if(index<0)return reject('MAGAZINE NOT ISSUED');
 const incoming=equipment.spareMagazines[index];
 if(incoming.rounds<=0)return reject('MAGAZINE EMPTY');
 if(incoming.id===oldId)return reject('MAGAZINE ALREADY LOADED');
 if(incoming.rounds<=equipment.loadedRounds&&
    equipment.loadedRounds>0)return reject('NO BETTER MAGAZINE');
 const outgoing:SecondaryMagazine={
  id:oldId,rounds:equipment.loadedRounds,location:incoming.location};
 const spares=equipment.spareMagazines.filter((_,i)=>i!==index);
 if(retain)spares.push(outgoing);
 const next:SecondaryEquipment={...equipment,
  loadedMagazineId:incoming.id,loadedRounds:incoming.rounds,
  spareMagazines:spares};
 const dropped=retain?null:outgoing;
 // Conservation is not a best-effort cosmetic statement; fail closed if a
 // future caller violates the issued-round identity contract.
 if(secondaryRoundTotal(next)+(dropped?.rounds??0)!==
    secondaryRoundTotal(equipment))
  return reject('MAGAZINE CONSERVATION ERROR');
 return {ok:true,equipment:next,dropped,selectedId:incoming.id};
}
/** Inventory-only candidate. S8 will add physical reach constraints before
 * executing an order; no auto refill and no hidden primary mag fallback.
 */
export function selectSecondaryReloadMagazine(equipment:SecondaryEquipment):
 string|null{
 if(!equipment.weapon)return null;
 let best:SecondaryMagazine|null=null;
 for(const spare of equipment.spareMagazines){
  if(spare.rounds<=equipment.loadedRounds)continue;
  if(!best||spare.rounds>best.rounds)best=spare;
 }
 return best?.id??null;
}
