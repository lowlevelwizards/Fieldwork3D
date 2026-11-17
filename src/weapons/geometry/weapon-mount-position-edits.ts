/** M2.6B: pure free repositioning, no inventory, credit or render effects.
 * Callers choose one of the solver's actual supported candidates.
 */
import {readWeaponConfiguration,sameWeaponConfiguration,
 type WeaponConfiguration} from '../../equipment-weapon-assemblies.ts';
import {physicalAttachmentFitOptions,
 type PhysicalAttachmentPlacement} from './weapon-physical-mount-fit.ts';
import {mountSelectionFromPlacement} from './weapon-mount-position.ts';
import {copyMountSelections,type MountableSlot}
 from './weapon-mount-selections.ts';
import {mountedAccessorySeat,resolveMountedAccessoryLayout}
 from './mounted-accessory-layout.ts';
export function chooseWeaponMountPosition(c:WeaponConfiguration,slot:MountableSlot,
 chosen:PhysicalAttachmentPlacement|null):WeaponConfiguration{
 const mounts=copyMountSelections(c.mountSelections)??{};
 if(chosen){
  if(chosen.attachmentSlot!==slot||chosen.attachmentId!==c.slots[slot])
   return c;
  const fit=physicalAttachmentFitOptions(c,chosen.attachmentId);
  const exact=fit.options.find(p=>p.ownerPartId===chosen.ownerPartId&&
   p.surfaceId===chosen.surfaceId&&p.face===chosen.face&&
   p.groupId===chosen.groupId&&Math.abs(p.x-chosen.x)<.001);
  if(!exact)return c;
  const intent=mountSelectionFromPlacement(c,exact);
  if(!intent)return c;
  mounts[slot]=intent;
 }else{
  if(!mounts[slot])return c;
  delete mounts[slot];
 }
 const next=readWeaponConfiguration({...c,mountSelections:mounts},c.weapon);
 const before=resolveMountedAccessoryLayout(c);
 const layout=resolveMountedAccessoryLayout(next);
 // M2.9: repair damaged/obsolete multi-mount saves one slot at a time.
 // Preserve unrelated unresolved legacy equipment in place, but never let
 // a position edit create a new unresolved accessory or displace a valid one.
 const previouslyUnresolved=new Set(before.unresolved.map(f=>f.attachmentId));
 const introducesConflict=layout.unresolved.some(f=>
  !previouslyUnresolved.has(f.attachmentId));
 const targetStillUnresolved=layout.unresolved.some(f=>
  f.attachmentId===c.slots[slot]);
 const seated=chosen?mountedAccessorySeat(next,slot)?.placement:undefined;
 if(introducesConflict||targetStillUnresolved||
  (chosen&&(!seated||
   seated.ownerPartId!==chosen.ownerPartId||
   seated.surfaceId!==chosen.surfaceId||
   seated.face!==chosen.face||
   Math.abs(seated.x-chosen.x)>.001)))return c;
 return sameWeaponConfiguration(c,next)?c:next;
}
