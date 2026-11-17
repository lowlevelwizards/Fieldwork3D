/** M2.6B — conversion from a verified physical candidate to stable intent.
 * The normalized longitudinal value represents a location on one authored
 * surface, not an unstable rail-tooth array index or a Three.js transform.
 */
import type {WeaponConfiguration} from '../../equipment-weapon-assemblies.ts';
import type {PhysicalAttachmentPlacement} from './weapon-physical-mount-fit.ts';
import {physicalWeaponMountSlots} from './weapon-physical-mount-slots.ts';
import type {MountSelection} from './weapon-mount-selections.ts';
export function mountSelectionFromPlacement(config:WeaponConfiguration,
 p:PhysicalAttachmentPlacement):MountSelection|undefined{
 if(!config.build)return undefined;
 const rails=physicalWeaponMountSlots(config.build,config.slots.opticMount)
  .filter(x=>x.surfaceId===p.surfaceId&&x.ownerPartId===p.ownerPartId&&
   x.face===p.face&&x.standard===p.standard);
 if(!rails.length)return undefined;
 const lo=Math.max(...rails.map(x=>x.railStartX));
 const hi=Math.min(...rails.map(x=>x.railEndX));
 if(!(hi>lo))return undefined;
 return {attachmentId:p.attachmentId,ownerPartId:p.ownerPartId,
  surfaceId:p.surfaceId,face:p.face,standard:p.standard,
  position:Math.max(0,Math.min(1,(p.x-lo)/(hi-lo)))};
}
export function mountSelectionCandidate(config:WeaponConfiguration,
 wanted:MountSelection,p:PhysicalAttachmentPlacement):boolean{
 if(wanted.attachmentId!==p.attachmentId||wanted.ownerPartId!==p.ownerPartId||
  wanted.surfaceId!==p.surfaceId||wanted.face!==p.face||
  wanted.standard!==p.standard)return false;
 const candidate=mountSelectionFromPlacement(config,p);
 // The chosen indexed tooth may shift slightly as authored art improves.
 // No arbitrary jumps to a different rail region or side.
 return !!candidate&&Math.abs(candidate.position-wanted.position)<=.13;
}
