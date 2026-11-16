/** A3.H1: cosmetic optic seating against the actually authored top surfaces.
 * Equipment resolver remains authoritative for compatibility, sight-height
 * and ballistic offsets. This function is strictly a renderer placement rule.
 */
import type {WeaponConfiguration} from '../../equipment-weapon-assemblies.ts';
import {akHandguardStart} from '../../breach-weapon-contact-zones.ts';
import {akBarrelArt} from './ak-barrel-profiles.ts';
import {HK_CLAW_VISUAL} from './hk-rail-accessories.ts';

export type OpticVisualSeat=Readonly<{
 x:number;supportY:number;mount:'hk-claw'|'ar-top'|'ak-handguard'|'legacy';
}>;
export function opticVisualSeat(config:WeaponConfiguration,
 resolvedMountX:number):OpticVisualSeat{
 const build=config.build;
 if(build?.family==='hk'&&config.slots.opticMount==='optic-hk-claw')
  return {x:resolvedMountX,supportY:HK_CLAW_VISUAL.supportTopY,mount:'hk-claw'};
 if(build?.family==='ar'&&build.parts.receiver==='ar-flat'){
  // AR flat-top Picatinny segments: tooth center Y=2.84, height=.34.
  // Magnified rings are spaced ~3.1 apart: align each foot with the
  // -1.5/+1.5 rail teeth (three teeth at -4.5,-1.5,+1.5).
  // A centered legacy x=-1 would float BOTH rings between those teeth.
  return {x:config.slots.optic==='optic-magnified'?.15:resolvedMountX,
   supportY:3.01,mount:'ar-top'};
 }
 if(build?.family==='ak'&&build.parts.handguard==='ak-rail-long'){
  // Unlike ARs, this AK optic sits on the raised FORE-END rail, not an
  // imagined rail over the curved stamped dust cover at mountX=0.
  const front=akBarrelArt(build.parts.barrel)?.handguardFrontX;
  if(front===undefined)throw Error('AK railed optic barrel missing');
  const upperRear=akHandguardStart(build.parts.receiver)+1.08;
  // Exact center of addAKFamily's rail cuboid. Height 2.88 + .48/2.
  return {x:(upperRear+.9+front)/2,supportY:3.12,mount:'ak-handguard'};
 }
 // Preserve original legacy shotgun geometry and future fallback behavior.
 return {x:resolvedMountX,supportY:3.25,mount:'legacy'};
}
