/** FN FAL 50.00 shared exterior art. Stage 1 comparison and live family
 * use the SAME compact solid profiles, never duplicated or per-frame rebuilt.
 * Pure appearance only: no firing, inventory, ballistics or physical assembly.
 *
 * +X points toward the muzzle, +Y is up, and Z is side-to-side depth.
 * The object is deliberately monochrome and constructed on demand, never per frame.
 * Live Arsenal and the one-material comparison lab share this same builder.
 */
import * as THREE from 'three';
import {addOutline,addCuboid,addFacetedTube,addBar,
 type Outline,type SlotName} from './profile-primitives.ts';
import {FAL_MAG20_OUTLINE,FAL_MAG20_DEPTH} from './fal-magazine-profiles.ts';
import {addFALFacetedHandguard} from './fal-handguard-profiles.ts';
import {addFALCrownedReceiver} from './fal-receiver-form.ts';

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

 // FAL rear stock: full butt, long level comb and narrow wrist near receiver.
 // No M16-style peak or G3-like constant-width wedge.
 // One uninterrupted, low-vertex stock volume with a broad miniaturized pad.
 // Shell ends inside the broad plate; the plate alone owns X=-15.
 // Preserve the FAL comb/wrist rather than inventing a taller M16-like hump.
 p('stock',[
  [-14.60,1.05],[-13.20,1.24],[-11.30,1.27],
  [-9.55,1.00],[-8.26,.52],[-6.20,.43],
  [-6.13,-.97],[-8.30,-1.49],[-10.55,-2.36],
  [-14.60,-3.39]
 ],3.00);
 b('stock',-14.56,-1.15,0,.88,4.85,3.55);

 // P4 R1A: one continuously crowned upper receiver mesh; broad faceted
 // shoulders taper toward the roof to visually echo the FAL handguard.
 // Not a rectangular extrude and not an AR/G3 imitation.
 addFALCrownedReceiver(root,partIds.receiver,ids.receiver++,materials.receiver);
 // Single angular lower, sculpting the grip/magazine negative space.
 // P4 R1B: broad one-piece LOWER, not a narrow dark strip behind the
 // upper shell. Its sloped belly makes the grip/guard/magwell relationship
 // legible at miniature scale. One silhouette, one material, no seam decals.
 lower([
  [-6.30,-1.08],[3.62,-1.03],[3.82,-1.43],
  [3.18,-2.65],[.14,-2.60],[-.80,-2.24],
  [-1.34,-2.40],[-2.67,-2.45],[-3.65,-2.69],
  [-4.60,-2.66],[-5.35,-2.04],[-6.30,-1.70]
 ],3.40);
 // Characteristic broad sloped FN magazine shroud. It is a receiver
 // landmark, not a separate functional magazine or insertion socket.
 lower([
  [-.36,-1.82],[3.16,-1.82],[3.50,-2.50],
  [3.04,-3.19],[-.12,-3.19],[-.65,-2.48]
 ],3.32);

 // S1C: compact raked FAL grip; preserve open mag/grip gap.
 p('grip',[
  [-5.12,-2.18],[-3.12,-2.18],
  [-3.94,-5.82],[-4.40,-6.44],
  [-5.96,-6.44],[-5.88,-4.87]
 ],2.16);
 p('magazine',FAL_MAG20_OUTLINE,FAL_MAG20_DEPTH);

 // One broad eight-facet FAL forearm: gently tucked TOP shoulders, not
 // the tubular G3 or triangular M16. Vent marks follow the flat side faces.
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
  [14.02,.20],[14.06,1.40],[14.24,1.73],
  [15.10,1.73],[15.35,1.43],[15.35,.20]
 ],2.20);
 const earProfile:Outline=[
  [14.15,1.42],[14.22,2.52],[14.41,2.94],
  [14.76,2.94],[15.04,2.63],[15.16,1.42]
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
  [20.93,-.58],[21.24,-.76],[21.73,-.74],
  [22.00,-.52],[22.00,.52],[21.73,.74],
  [21.24,.76],[20.93,.58]
 ],1.78);
 // S1C: low chunky rear blade; no knobs, pins or aperture holes.
 p('receiver',[
  [-5.52,1.82],[-5.42,2.49],[-5.06,2.76],
  [-4.72,2.66],[-4.48,1.82]
 ],1.74);

 // A small offset folding-handle representation: bent steel support with
 // long rearward horizontal polymer grip. Both solids physically overlap;
 // no AR-style upright arch, hollow box, hinges or screws. Factory enabled.
 if(options.raisedCarryHandle){
  const support=addBar(root,'receiver',partIds.receiver,ids.receiver++,
   [3.20,1.42],[2.90,3.23],.50,.62,materials.receiver);
  support.position.z=-1.60;
  support.userData.falCarrySupport=true;
  // One contoured handhold instead of a floating cuboid; this is an
  // offset folding FAL carrying handle, never an AR bridge/arch.
  const grip=addOutline(root,'receiver',partIds.receiver,ids.receiver++,[
   [-.29,3.16],[-.12,3.58],[.22,3.83],
   [2.64,3.83],[3.07,3.57],[3.07,3.16],
   [2.71,2.99],[.05,2.99]
  ],.90,materials.stock);
  grip.position.z=-1.61;
  grip.userData.falCarryGrip=true;
 }
 return root;
}
