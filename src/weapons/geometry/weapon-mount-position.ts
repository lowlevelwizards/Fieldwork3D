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
/** Smaller is closer. A candidate on another owner/face can never be
 * 'close enough', even when its longitudinal X matches. */
export function mountSelectionDistance(config:WeaponConfiguration,
 wanted:MountSelection,p:PhysicalAttachmentPlacement):number{
 if(wanted.attachmentId!==p.attachmentId||wanted.ownerPartId!==p.ownerPartId||
  wanted.surfaceId!==p.surfaceId||wanted.face!==p.face||
  wanted.standard!==p.standard)return Infinity;
 const candidate=mountSelectionFromPlacement(config,p);
 return candidate?Math.abs(candidate.position-wanted.position):Infinity;
}
export function mountSelectionCandidate(config:WeaponConfiguration,
 wanted:MountSelection,p:PhysicalAttachmentPlacement):boolean{
 // An authored rail refinement may shift a single contact slightly.
 // Reject larger jumps; the UI must ask for a new explicit position.
 return mountSelectionDistance(config,wanted,p)<=.13;
}
