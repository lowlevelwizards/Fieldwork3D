/** M2.4C — deterministic aimed-pose eye-box calibration.
 * No per-frame pose queries or new optical ballistics. Reference is derived
 * from the actual selected stock-contact X and platform-specific authored
 * aimed-eye Y, in the same unscaled local weapon coordinate system.
 * The live operator aim rig remains authoritative for motion; this static
 * fit is checked on equipment edits, not at each animation transition.
 */
import {FAMILY_PARTS} from '../../equipment-weapon-families.ts';
import type {WeaponConfiguration} from '../../equipment-weapon-assemblies.ts';
import type {OpticProfile} from './optic-profiles.ts';
import type {PhysicalAttachmentPlacement} from './weapon-physical-mount-fit.ts';

export type OpticEyeReference=Readonly<{x:number;y:number;z:number;source:'aimed-stock-contact'}>;
export type OpticEyeBoxCheck=Readonly<{
 valid:boolean;distance:number;verticalError:number;lateralError:number;
 reason?:'forward-eye-relief'|'eye-alignment';
 eye:OpticEyeReference;ocularX:number;axisY:number;axisZ:number;
}>;
/** Calibrated visual baseline; not an invented on/off weapon-stat modifier.
 * Shared shoulder-fit starts from the true stockX in every family build.
 */
export function aimedOpticEyeReference(c:WeaponConfiguration):OpticEyeReference{
 const stockX=c.build?FAMILY_PARTS[c.build.parts.stock]?.stockX:-13.5;
 const x=(stockX??-13.5)+6.25;
 const y=c.build?.family==='ak'?5.15:
  c.build?.family==='hk'?5.05:
  c.build?.family==='ar'?5.13:5.15;
 return {x,y,z:0,source:'aimed-stock-contact'};
}
export function opticEyeBoxCheck(c:WeaponConfiguration,p:OpticProfile,
 placement:PhysicalAttachmentPlacement):OpticEyeBoxCheck{
 const eye=aimedOpticEyeReference(c);
 const ocularX=placement.x+p.visual.eyepieceOffsetX;
 const axisY=placement.y+p.visual.supportRiseY+p.visual.axisAboveBaseY;
 const axisZ=p.mount.standard==='ak-side-dovetail'?
  p.visual.axisOffsetZ:placement.z+p.visual.axisOffsetZ;
 const distance=ocularX-eye.x;
 const verticalError=Math.abs(axisY-eye.y);
 const lateralError=Math.abs(axisZ-eye.z);
 const aligned=verticalError<=p.eyeRelief.maxVerticalError&&
  lateralError<=p.eyeRelief.maxLateralError;
 const relief=p.eyeRelief.mode==='unrestricted'||
  (distance>=(p.eyeRelief.minDistance??-Infinity)&&
   distance<=(p.eyeRelief.maxDistance??Infinity));
 return {valid:aligned&&relief,distance,verticalError,lateralError,
  ...(relief?(aligned?{}:{reason:'eye-alignment' as const}):
   {reason:'forward-eye-relief' as const}),
  eye,ocularX,axisY,axisZ};
}
