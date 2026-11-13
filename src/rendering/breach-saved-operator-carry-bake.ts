/** P7: immutable visual projection of a saved operator's kit.
 * Read-only: simulation still calculates authoritative inventory, magazine
 * counts, and reload/medical access independently. This stores only model
 * pouch placement, not ammunition/health state or future replay knowledge.
 */
import type {TeamActor} from '../breach-game.ts';
import {carryPlacementLedger,type CarryPlacement} from '../equipment-carry-placement.ts';
const EMPTY:readonly CarryPlacement[]=Object.freeze([]);
type Snapshot={
 signature:string;all:readonly CarryPlacement[];
 magazines:readonly CarryPlacement[];
 locations:readonly CarryPlacement['location'][];
 medical?:CarryPlacement['location'];utility?:CarryPlacement['location'];
};
const cached=new WeakMap<TeamActor,Snapshot>();
const empty:Snapshot={signature:'',all:EMPTY,magazines:EMPTY,
 locations:EMPTY};
function visualSignature(a:TeamActor):string{
 const kit=a.equipment;
 if(!kit)return '';
 // Saved customization is occasionally edited in place in Studio; capture
 // the actual slot choices, not just object identity or a stale revision.
 let key='';
 for(const k in kit.slots){
  const slot=k as keyof typeof kit.slots;
  key+=k+':'+kit.slots[slot]+'|';
 }
 // Rounds do not affect the appearance of a spare magazine. IDs and carry
 // assignments do; include them even when the array identity is unchanged.
 for(const mag of a.spareMagazines)
  key+=mag.id+'@'+(mag.location??'?')+'|';
 return key;
}
export function bakedOperatorCarry(a:TeamActor):Snapshot{
 if(!a.equipment)return empty;
 const signature=visualSignature(a);
 const previous=cached.get(a);
 if(previous?.signature===signature)return previous;
 const all=carryPlacementLedger(a.equipment,a.spareMagazines);
 const magazines=all.filter(p=>p.kind==='magazine');
 const snapshot:Snapshot={
  signature,all,magazines,
  locations:magazines.map(p=>p.location),
  medical:all.find(p=>p.kind==='medical')?.location,
  utility:all.find(p=>p.kind==='utility')?.location
 };
 cached.set(a,snapshot);
 return snapshot;
}
/** Prebake on initial soldier creation, before the first hot firing frame. */
export function prewarmSavedOperatorCarry(a:TeamActor):void{
 bakedOperatorCarry(a);
}
