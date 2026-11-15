/** FN FAL 50.00 shared exterior art. Stage 1 comparison and live family
 * use the SAME compact solid profiles, never duplicated or per-frame rebuilt.
 * Pure appearance only: no firing, inventory, ballistics or physical assembly.
 *
 * +X points toward the muzzle, +Y is up, and Z is side-to-side depth.
 * The object is deliberately monochrome and constructed on demand, never per frame.
 * Live Arsenal and the one-material comparison lab share this same builder.
 */
import * as THREE from 'three';
import {addOutline,addCuboid,
 type Outline,type SlotName} from './profile-primitives.ts';
import {FAL_MAG20_OUTLINE,FAL_MAG20_DEPTH,falMagazineRibOutlines} from './fal-magazine-profiles.ts';
import {addFALFacetedHandguard} from './fal-handguard-profiles.ts';
import {addFALCrownedReceiver,addFALAngledCarrySupport} from './fal-receiver-form.ts';

export const FAL_ART:Readonly<{
 stockRearX:number;receiverRearX:number;receiverFrontX:number;
 handguardStartX:number;handguardEndX:number;frontSightX:number;
 muzzleX:number;magazineCenterX:number;magazineBottomY:number;
}> = Object.freeze({
 stockRearX:-15.00,receiverRearX:-6.60,receiverFrontX:3.85,
 handguardStartX:4.20,handguardEndX:14.10,
 frontSightX:14.70,muzzleX:22.00,
 magazineCenterX:1.35,magazineBottomY:-8.05
});

export type FALCoreOptions={raisedCarryHandle?:boolean;showFactoryMuzzle?:boolean};
export type FALCoreMaterials=Readonly<Record<SlotName,THREE.Material>&{receiverLower?:THREE.Material;magazineRib?:THREE.Material;muzzleSlot?:THREE.Material}>;
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
  // Keep the P7 drooping comb and thin depth, but give the heel
  // proper 7.62-stock weight instead of a miniature short butt.
  [-14.60,.12],[-11.60,.27],[-8.10,.72],[-6.12,.72],
  [-6.12,-.82],[-8.70,-1.47],[-11.50,-3.62],[-14.60,-4.09]
 ],2.34);
 b('stock',-14.56,-1.99,0,.88,4.26,2.66);

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
  [-5.38,-2.18],[-3.18,-2.18],[-4.67,-5.85],[-6.52,-5.85]
 ],2.16);
 p('magazine',FAL_MAG20_OUTLINE,FAL_MAG20_DEPTH);
 // Two thick stamped ribbons follow the same straight magazine centerline
 // as the silhouette. Metal marks, NOT rows of applied little rectangles.
 for(const shape of falMagazineRibOutlines()){
  const rib=addOutline(root,'magazine',partIds.magazine,ids.magazine++,
   shape,FAL_MAG20_DEPTH+.08,materials.magazineRib??materials.magazine);
  rib.userData.falStampedRib=true;
  rib.castShadow=false;rib.receiveShadow=false;
 }

 // Tall six-corner FAL fore-end, with long angular shoulders and no
 // decorative lower chamfers. Simple rectangular vents follow its surface.
 addFALFacetedHandguard(root,partIds.handguard,ids.handguard++,materials.handguard);

 // One six-sided barrel. The gas-block sight is near the end of the
 // handguard rather than at the muzzle as on the G3.
 const barrelEnd=options.showFactoryMuzzle===false?22.00:21.15;
 const barrel=b('barrel',(13.85+barrelEnd)/2,0,0,
  barrelEnd-13.85,.92,.92);
 barrel.userData.falBoxBarrel=true;
 // Simplified graphic FAL protective front sight: three upright boxes
 // and one square base. Deliberately no angled bevels or punched details.
 const sightBase=b('barrel',14.70,.76,0,1.18,1.42,2.18);
 sightBase.userData.falFrontBase=true;
 for(const side of [-1,1] as const){
  const ear=b('barrel',14.70,2.13,side*.77,.62,1.67,.46);
  ear.userData.falFrontEar=side<0?'left':'right';
 }
 const post=b('barrel',14.70,2.08,0,.24,1.24,.24);
 post.userData.falFrontPost=true;
 // Late-pattern FAL-style COMBO device: a long slim square sleeve
 // immediately after a broad collar. Not a generic short end cap.
 if(options.showFactoryMuzzle!==false){
  const collar=b('barrel',20.22,0,0,.34,1.30,1.32);
  collar.userData.falMuzzleCollar=true;
  const device=b('barrel',21.12,0,0,1.76,1.00,1.00);
  device.userData.falMuzzleCombo=true;
  // Two bold stamped slots batched into one four-triangle graphic.
  const verts:number[]=[],indices:number[]=[];
  for(const side of [-1,1] as const){
   const first=verts.length/3,z=side*.536;
   for(const [x,y] of [[20.57,-.15],[21.48,-.15],
                         [21.48,.15],[20.57,.15]])
    verts.push(x,y,z);
   if(side===1)indices.push(first,first+1,first+2,first,first+2,first+3);
   else indices.push(first,first+2,first+1,first,first+3,first+2);
  }
  const slotGeometry=new THREE.BufferGeometry();
  slotGeometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  slotGeometry.setIndex(indices);slotGeometry.computeVertexNormals();
  const slots=new THREE.Mesh(slotGeometry,materials.muzzleSlot??materials.barrel);
  slots.name='family-barrel-'+partIds.barrel+'-'+ids.barrel++;
  slots.userData.falMuzzleSlots=true;
  slots.castShadow=false;slots.receiveShadow=false;
  slots.renderOrder=3;root.add(slots);
 }
 // A single substantial rear sight blade, no miniature articulated parts.
 b('receiver',-5.00,2.18,0,.80,.74,1.58);
 // A small offset folding-handle representation: bent steel support with
 // long rearward horizontal polymer grip. Both solids physically overlap;
 // no AR-style upright arch, hollow box, hinges or screws. Factory enabled.
 if(options.raisedCarryHandle){
  addFALAngledCarrySupport(root,partIds.receiver,ids.receiver++,
   materials.receiver);
  // One giant RECTANGULAR handhold. No tiny chamfers or floating arch.
  const grip=addCuboid(root,'receiver',partIds.receiver,ids.receiver++,
   1.08,3.55,-1.61,4.08,1.05,1.15,materials.stock);
  grip.userData.falCarryGrip=true;
 }
 // P7: trigger guard intentionally omitted; the negative space stays open.

 return root;
}
