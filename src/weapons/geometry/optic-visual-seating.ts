/** M1.3: optic visual placement resolves an installed *part's* mounting
 * surface, rather than independently checking family names and offsets.
 * Ballistic sight height and equipment assembly data remain untouched.
 */
import type {WeaponConfiguration} from '../../equipment-weapon-assemblies.ts';
import {preferredOpticMountSurface} from './weapon-part-mount-surfaces.ts';
export type OpticVisualSeat=Readonly<{
 x:number;supportY:number;mount:'hk-claw'|'ar-top'|'ak-handguard'|'legacy';
}>;
export function opticVisualSeat(config:WeaponConfiguration,
 resolvedMountX:number):OpticVisualSeat{
 const build=config.build;
 if(build){
  const surface=preferredOpticMountSurface(build,config.slots.opticMount);
  if(surface){
   if(surface.ownerPartId==='optic-hk-claw')
    return {x:resolvedMountX,supportY:surface.y,mount:'hk-claw'};
   if(surface.ownerPartId==='ar-flat'){
    // Three physical teeth at -4.5/-1.5/+1.5. Both magnified rings must
    // touch tooth support, not hover over their gaps.
    return {x:config.slots.optic==='optic-magnified'?.15:resolvedMountX,
     supportY:surface.y,mount:'ar-top'};
   }
   if(surface.ownerPartId==='ak-rail-long'){
    // Fore-end top rail owns its actual support span. Do not fabricate a
    // receiver rail above the AK's curved dust cover.
    return {x:(surface.startX+surface.endX)/2,
     supportY:surface.y,mount:'ak-handguard'};
   }
  }
 }
 // No optic rail: preserve the legacy shotgun/fallback coordinate contract.
 return {x:resolvedMountX,supportY:3.25,mount:'legacy'};
}
