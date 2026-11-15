/** FN FAL 50.00 shared exterior art. Stage 1 comparison and live family
 * use the SAME compact solid profiles, never duplicated or per-frame rebuilt.
 * Pure appearance only: no firing, inventory, ballistics or physical assembly.
 *
 * +X points toward the muzzle, +Y is up, and Z is side-to-side depth.
 * The object is deliberately monochrome and constructed on demand, never per frame.
 * Live Arsenal and the one-material comparison lab share this same builder.
 */
import * as THREE from 'three';
import {addOutline,addCuboid,addFacetedTube,
 type Outline,type SlotName} from './profile-primitives.ts';
import {FAL_MAG20_OUTLINE,FAL_MAG20_DEPTH} from './fal-magazine-profiles.ts';
import {addFALFacetedHandguard} from './fal-handguard-profiles.ts';
import {addFALCrownedReceiver,addFALAngledCarrySupport} from './fal-receiver-form.ts';

export const FAL_ART:Readonly<{
 stockRearX:number;receiverRearX:number;receiverFrontX:number;
 handguardStartX:number;handguardEndX:number;frontSightX:number;
 muzzleX:number;magazineCenterX:number;magazineBottomY:number;
}> = Object.freeze({
 stockRearX:-15.00,receiverRearX:-6.60,receiverFrontX:3.85,
 handguardStartX:3.65,handguardEndX:14.10,
 frontSightX:14.70,muzzleX:22.00,
 magazineCenterX:1.35,magazineBottomY:-8.05
});

export type FALCoreOptions={raisedCarryHandle?:boolean;showFactoryMuzzle?:boolean};
export type FALCoreMaterials=Readonly<Record<SlotName,THREE.Material>&{receiverLower?:THREE.Material}>;
export type FALCoreIds=Readonly<Record<SlotName,string>>;
/** One source of geometry for the test lab and production FAL. */
export function buildFALCoreSilhouette(
 materials:FALCoreMaterials, partIds:FALCoreIds,options:FALCoreOptions={}
):THREE.Group{
 const root=new THREE.Group();
 root.name='fal-5000-core-silhouette';
 const ids:Record<SlotName,number>={
  stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0
 };
 const p=(slot:SlotName,points:Outline,depth:number)=>
  addOutline(root,slot,partIds[slot],ids[slot]++,points,depth,materials[slot]);
 const b=(slot:SlotName,x:number,y:number,z:number,w:number,h:number,d:number)=>
  addCuboid(root,slot,partIds[slot],ids[slot]++,x,y,z,w,h,d,materials[slot]);
 const lower=(points:Outline,depth:number)=>
  addOutline(root,'receiver',partIds.receiver,ids.receiver++,points,depth,
   materials.receiverLower??materials.receiver);

 // P5 stock: broad chunky heel and strongly pinched neck behind receiver.
 // No M16-style peak or G3-like constant-width wedge.
 // One uninterrupted, low-vertex stock volume with a broad miniaturized pad.
 // Shell ends inside the broad plate; the plate alone owns X=-15.
 // Preserve the FAL comb/wrist rather than inventing a taller M16-like hump.
 p('stock',[
  // Drooping rear comb and broad butt, narrowed in DEPTH, not side height.
  [-14.60,.12],[-11.60,.27],[-8.10,.72],[-6.12,.72],
  [-6.12,-.82],[-8.70,-1.13],[-11.50,-2.64],[-14.60,-2.78]
 ],2.34);
 b('stock',-14.56,-1.33,0,.88,3.02,2.66);

 // P6: one reduced-triangle upper receiver mesh; broad intentional faceted
 // shoulders taper toward the roof to visually echo the FAL handguard.
 // Not a rectangular extrude and not an AR/G3 imitation.
 addFALCrownedReceiver(root,partIds.receiver,ids.receiver++,materials.receiver);
 // Single integrated lower AND FAL magazine shroud. No overlapping well
 // plate or decorative seam: the front drops directly into the mag lip.
 lower([
  [-6.30,-1.12],[3.55,-1.12],[3.06,-3.19],
  [-.10,-3.19],[-.90,-2.35],[-4.55,-2.35],[-6.30,-1.80]
 ],3.40);

 // P5 grip: short, stout, swept back; preserve open trigger/mag gap.
 p('grip',[
  [-5.38,-2.18],[-3.18,-2.18],[-4.07,-6.48],[-6.12,-6.48]
 ],2.16);
 p('magazine',FAL_MAG20_OUTLINE,FAL_MAG20_DEPTH);

 // Tall six-corner FAL fore-end, with long angular shoulders and no
 // decorative lower chamfers. Simple rectangular vents follow its surface.
 addFALFacetedHandguard(root,partIds.handguard,ids.handguard++,materials.handguard);

 // One six-sided barrel. The gas-block sight is near the end of the
 // handguard rather than at the muzzle as on the G3.
 const barrel=addFacetedTube(root,'barrel',partIds.barrel,
  ids.barrel++,13.85,options.showFactoryMuzzle===false?22.00:21.15,.61,materials.barrel);
 barrel.position.y=0;
 // Authentic protected FAL post: one broad gas-block base, two lateral
 // ears and a central post. Ears spread across Z, NOT along barrel X like
 // an M16 A-frame. Large contiguous shapes, no pins or mechanism geometry.
 p('barrel',[
  [14.02,.20],[14.02,1.62],[15.35,1.62],[15.35,.20]
 ],2.20);
 const earProfile:Outline=[
  [14.18,1.42],[14.24,2.52],[14.57,2.94],[15.15,1.42]
 ];
 const leftEar=p('barrel',earProfile,.46);
 leftEar.position.z=-.79;
 leftEar.userData.falFrontEar='left';
 const rightEar=p('barrel',earProfile,.46);
 rightEar.position.z=.79;
 rightEar.userData.falFrontEar='right';
 const sightPost=b('barrel',14.70,2.16,0,.22,1.24,.23);
 sightPost.userData.falFrontPost=true;
 // Simple short Belgian factory muzzle; omit when a mounted muzzle replaces it.
 if(options.showFactoryMuzzle!==false)p('barrel',[
  [20.93,-.58],[21.24,-.74],[22.00,-.58],
  [22.00,.58],[21.24,.74],[20.93,.58]
 ],1.78);
 // S1C: low chunky rear blade; no knobs, pins or aperture holes.
 p('receiver',[
  [-5.52,1.82],[-5.42,2.49],[-4.82,2.76],[-4.48,1.82]
 ],1.74);

 // A small offset folding-handle representation: bent steel support with
 // long rearward horizontal polymer grip. Both solids physically overlap;
 // no AR-style upright arch, hollow box, hinges or screws. Factory enabled.
 if(options.raisedCarryHandle){
  addFALAngledCarrySupport(root,partIds.receiver,ids.receiver++,
   materials.receiver);
  // One contoured handhold instead of a floating cuboid; this is an
  // offset folding FAL carrying handle, never an AR bridge/arch.
  const grip=addOutline(root,'receiver',partIds.receiver,ids.receiver++,[
   [-.72,3.14],[-.40,3.99],[2.51,3.99],
   [3.05,3.65],[3.05,3.14],[-.31,3.14]
  ],.90,materials.stock);
  grip.position.z=-1.61;
  grip.userData.falCarryGrip=true;
 }
 // P7: trigger guard intentionally omitted; the negative space stays open.

 return root;
}
