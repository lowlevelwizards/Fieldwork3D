/** B28: inventory-identity -> visual magazine slot, no duplicate ammo pool.
 * All functions are replay-time pure and do not alter simulation inventory.
 */
import type {CarryPlacement} from './equipment-carry-placement.ts';
import * as THREE from 'three';
export type VisibleMagLocation='rig'|'belt'|'pocket';
export type ReloadPouchSlot={id:string;location:VisibleMagLocation;index:number};
export type ReloadPickupPhase='stowed'|'retrieving'|'held'|'inserted';
const visible=(x:CarryPlacement['location']):x is VisibleMagLocation=>
 x==='rig'||x==='belt'||x==='pocket';
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{const t=clamp(v);return t*t*(3-2*t)};
/** Bind the simulation-selected magazine ID to its exact authored mesh.
 * Display arrays are ordered within rig/belt/pocket independently.
 * If the selected ID is explicitly known but absent, NEVER borrow another.
 * Only standalone Lab previews may elect the first accessible visible mag.
 */
export function selectedReloadPouchSlot(
 carried:readonly Pick<CarryPlacement,'id'|'kind'|'location'>[],
 selectedId:string|null|undefined,
 labFallback=false
):ReloadPouchSlot|null{
 const indices:{rig:number;belt:number;pocket:number}={
  rig:0,belt:0,pocket:0};
 let fallback:ReloadPouchSlot|null=null;
 const priority=(loc:VisibleMagLocation)=>
  loc==='rig'?0:loc==='belt'?1:2;
 for(const p of carried){
  if(p.kind!=='magazine'||!visible(p.location))continue;
  const candidate={id:p.id,location:p.location,index:indices[p.location]++};
  if(selectedId===p.id)return candidate;
  if(labFallback&&!selectedId&&(!fallback||
    priority(candidate.location)<priority(fallback.location)))
   fallback=candidate;
 }
 return !selectedId&&labFallback?fallback:null;
}
export function v4ReloadPickupPhase(progress:number):ReloadPickupPhase{
 const t=clamp(progress);
 return t<.35?'stowed':t<.60?'retrieving':t<.82?'held':'inserted';
}
/** A bounded rendezvous: wrist goes from gun toward the *existing* pouch,
 * holds it briefly, then follows the insertion path back to the magwell.
 * .29 detach / .82 insertion remain authoritative gameplay events.
 */
export function v4ReloadPouchReach(progress:number):number{
 const t=clamp(progress);
 if(t<=.35||t>=.76)return 0;
 if(t<.51)return smooth((t-.35)/.16);
 if(t<.60)return 1;
 return 1-smooth((t-.60)/.16);
}
export function v4MagazineInHand(progress:number):boolean{
 const t=clamp(progress);
 // An older magazine is carried through withdrawal; after it is stowed
 // or discarded the new one first appears after the pouch rendezvous.
 return t>=.29&&t<.47||t>=.60&&t<.82;
}
export function v4SelectedPouchVisible(progress:number):boolean{
 return clamp(progress)<.60;
}

/** Exact authored local socket without reading last frame's world matrices.
 * Rig magazines live on the chest or on nested wardrobe gear. Belt/pocket
 * magazines live on the sibling hip whose REST height is 20.2 vs chest 26.
 * Neither previous-frame chest yaw nor IK can contaminate a replay seek.
 */
export function v4AuthoredPouchAnchor(
 mesh:THREE.Object3D,chest:THREE.Object3D,hip:THREE.Object3D
):THREE.Vector3|null{
 const point=mesh.position.clone();
 let parent=mesh.parent;
 let depth=0;
 while(parent&&parent!==chest&&parent!==hip&&depth++<8){
  parent.updateMatrix();
  point.applyMatrix4(parent.matrix);
  parent=parent.parent;
 }
 if(parent!==chest&&parent!==hip)return null;
 if(parent===hip)point.y+=20.2-26;
 return point.add(new THREE.Vector3(0,.75,0));
}
