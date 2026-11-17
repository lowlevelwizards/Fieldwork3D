/** M2.4D: one physical optic seat chosen by the same mount/eye-box solver
 * used for the Arsenal preview. Legacy invalid configurations still display
 * their existing optic instead of silently deleting a paid item.
 * Visual-only: gameplay sightHeight and muzzle/ballistic origins unchanged.
 */
import type {WeaponConfiguration} from '../../equipment-weapon-assemblies.ts';
import {physicalAttachmentFitOptions} from './weapon-physical-mount-fit.ts';
import {opticProfile} from './optic-profiles.ts';
import {preferredOpticMountSurface} from './weapon-part-mount-surfaces.ts';
export type OpticVisualSeat=Readonly<{
 x:number;supportY:number;z?:number;
 mount:'hk-claw'|'ar-top'|'ak-handguard'|'ak-side-bridge'|
  'ak-direct-side'|'legacy';
}>;
export function opticVisualSeat(config:WeaponConfiguration,
 resolvedMountX:number):OpticVisualSeat{
 const build=config.build;
 if(build){
  const optic=opticProfile(config.slots.optic);
  if(optic&&optic.mount.standard!=='integrated'){
   const fit=physicalAttachmentFitOptions(config,config.slots.optic);
   if(fit.feasible&&fit.options[0]){
    const point=fit.options[0],owner=point.ownerPartId;
    return {x:point.x,
     supportY:point.y+optic.visual.supportRiseY,
     z:optic.mount.standard==='ak-side-dovetail'?
      optic.visual.axisOffsetZ:point.z,
     mount:owner==='optic-ak-side-picatinny'?'ak-side-bridge':
      owner==='optic-hk-claw'?'hk-claw':
      owner==='ar-flat'?'ar-top':
      owner==='ak-rail-long'?'ak-handguard':
      optic.mount.standard==='ak-side-dovetail'?'ak-direct-side':'legacy'};
   }
  }
  // Legacy saves can carry physically invalid placements. Preserve the
  // renderer fallback for them until the transaction/migration stage.
  const surface=preferredOpticMountSurface(build,config.slots.opticMount);
  if(surface){
   if(surface.ownerPartId==='optic-ak-side-picatinny')
    return {x:resolvedMountX,supportY:surface.y,mount:'ak-side-bridge'};
   if(surface.ownerPartId==='optic-hk-claw')
    return {x:resolvedMountX,supportY:surface.y,mount:'hk-claw'};
   if(surface.ownerPartId==='ar-flat')
    return {x:config.slots.optic==='optic-magnified'?.15:resolvedMountX,
     supportY:surface.y,mount:'ar-top'};
   if(surface.ownerPartId==='ak-rail-long')
    return {x:(surface.startX+surface.endX)/2,
     supportY:surface.y,mount:'ak-handguard'};
  }
 }
 return {x:resolvedMountX,supportY:3.25,mount:'legacy'};
}
