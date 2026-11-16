/** FN FAL 50.00 shared exterior art. Stage 1 comparison and live family
 * use the SAME compact solid profiles, never duplicated or per-frame rebuilt.
 * Pure appearance only: no firing, inventory, ballistics or physical assembly.
 *
 * +X points toward the muzzle, +Y is up, and Z is side-to-side depth.
 * The object is deliberately monochrome and constructed on demand, never per frame.
 * Live Arsenal and the one-material comparison lab share this same builder.
 */
import * as THREE from 'three';
import {addOutline,addCuboid,addBar,
 type Outline,type SlotName} from './profile-primitives.ts';
import {FAL_MAG20_OUTLINE,FAL_MAG20_DEPTH,falMagazineRibOutlines} from './fal-magazine-profiles.ts';
import {addFALFacetedHandguard} from './fal-handguard-profiles.ts';
import {addFALCrownedReceiver,addFALAngledCarrySupport} from './fal-receiver-form.ts';
import {FAL_BARREL_ART} from './fal-barrel-profiles.ts';

export const FAL_ART:Readonly<{
 stockRearX:number;receiverRearX:number;receiverFrontX:number;
 handguardStartX:number;handguardEndX:number;frontSightX:number;
 muzzleX:number;magazineCenterX:number;magazineBottomY:number;
}> = Object.freeze({
 stockRearX:-15.00,receiverRearX:-6.60,receiverFrontX:3.85,
 handguardStartX:4.20,handguardEndX:14.10,
 frontSightX:14.70,muzzleX:22.00,
 magazineCenterX:1.00,magazineBottomY:-8.05
});

export type FALCoreOptions={raisedCarryHandle?:boolean;showFactoryMuzzle?:boolean};
export type FALCoreMaterials=Readonly<Record<SlotName,THREE.Material>&{receiverLower?:THREE.Material;magazineRib?:THREE.Material;muzzleSlot?:THREE.Material;muzzleMetal?:THREE.Material;transitionMetal?:THREE.Material;carryHandle?:THREE.Material}>;
export type FALCoreIds=Readonly<Record<SlotName,string>>;
/** One source of geometry for the test lab and production FAL. */
export function buildFALCoreSilhouette(
 materials:FALCoreMaterials, partIds:FALCoreIds,options:FALCoreOptions={}
):THREE.Group{
 const root=new THREE.Group();
 root.name='fal-5000-core-silhouette';
 const barrelArt=FAL_BARREL_ART[partIds.barrel]??FAL_BARREL_ART['fal-21-service'];
 const shortDelta=barrelArt.muzzleX-FAL_ART.muzzleX;
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
 if(partIds.stock==='fal-para-folder'){
  // Distinct silhouette with genuine NEGATIVE SPACE, not a solid fixed butt.
  // Five bold low-poly elements only: upper and lower rails, connecting
  // brace, chunky folding-hinge block and a rectangular rear pad.
  // StockX stays -15 so the existing shoulder-contact pose remains valid.
  const rail=(a:readonly [number,number],end:readonly [number,number],width:number)=>{
   const mesh=addBar(root,'stock',partIds.stock,ids.stock++,a,end,
    width,1.08,materials.stock);
   mesh.userData.falParaRail=true;
  };
  rail([-6.34,.39],[-14.26,.38],.78);
  rail([-6.34,-1.51],[-14.26,-3.21],.72);
  rail([-7.05,-.90],[-9.18,-1.95],.65);
  const hinge=b('stock',-6.38,-.56,0,1.14,2.40,2.28);
  hinge.userData.falParaHinge=true;
  const pad=b('stock',-14.56,-1.68,0,.88,4.66,2.52);
  pad.userData.falParaButt=true;
 }else{
  // Approved P10 fixed-stock silhouette; wood and polymer use EXACTLY
  // the same geometry. No new chamfers or wood-specific tessellation.
  p('stock',[
   [-14.60,.12],[-11.60,.27],[-8.10,.72],[-6.12,1.48],
   [-6.12,-.82],[-8.70,-1.60],[-11.50,-4.20],[-14.60,-4.81]
  ],2.34);
  b('stock',-14.56,-2.35,0,.88,4.98,2.66);
 }

 // P6: one reduced-triangle upper receiver mesh; broad intentional faceted
 // shoulders taper toward the roof to visually echo the FAL handguard.
 // Not a rectangular extrude and not an AR/G3 imitation.
 addFALCrownedReceiver(root,partIds.receiver,ids.receiver++,materials.receiver);
 // Single integrated lower AND FAL magazine shroud. No overlapping well
 // plate or decorative seam: the front drops directly into the mag lip.
 lower([
  [-6.30,-1.12],[3.24,-1.12],[3.00,-3.19],
  [-1.10,-3.19],[-1.45,-2.35],[-4.55,-2.35],[-6.30,-1.80]
 ],3.40);
 // FAL's distinct exposed cubist steel gas/receiver collar: intentionally
 // one dark rectangular bridge in the clear space between the upper shell
 // ending at X=3.10 and the fore-end beginning at X=4.20.
 // Attachment/ballistic muzzle landmarks remain unchanged.
 const transition=addCuboid(root,'receiver',partIds.receiver,ids.receiver++,
  3.65,.06,0,1.30,2.55,2.16,
  materials.transitionMetal??materials.receiverLower??materials.receiver);
 transition.userData.falReceiverHandguardBridge=true;

 // P10: a tiny +X translation of the existing four-point grip;
 // preserve its short height, rake, width and open trigger/mag gap.
 p('grip',[
  [-5.14,-2.18],[-2.94,-2.18],[-4.72,-5.85],[-6.57,-5.85]
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
 const barrelEnd=options.showFactoryMuzzle===false?
  barrelArt.muzzleX:18.58+shortDelta;
 const barrel=b('barrel',(13.85+barrelEnd)/2,0,0,
  barrelEnd-13.85,.92,.92);
 barrel.userData.falBarrelLength=barrelArt.nominalInches;
 barrel.userData.falBoxBarrel=true;
 // FAL P8: a monumental U-shaped sight, nothing fiddly inside it.
 // Only the base and two chunky rectangular ears; no central post.
 const sightBase=b('barrel',14.70,.80,0,1.35,1.60,2.62);
 sightBase.userData.falFrontBase=true;
 for(const side of [-1,1] as const){
  const ear=b('barrel',14.70,2.18,side*.73,.80,1.98,.78);
  ear.userData.falFrontEar=side<0?'left':'right';
 }
 // Exaggerated FN-style combination device: roughly double the P7 length,
 // broad steel collar and one long chunky four-sided body. Preserve X=22
 // as the muzzle for all pose, camera, firing and ballistic contracts.
 if(options.showFactoryMuzzle!==false){
  const collar=addCuboid(root,'barrel',partIds.barrel,ids.barrel++,
   18.59+shortDelta,0,0,.56,1.75,1.76,materials.muzzleMetal??materials.barrel);
  collar.userData.falMuzzleCollar=true;
  const device=addCuboid(root,'barrel',partIds.barrel,ids.barrel++,
   20.32+shortDelta,0,0,3.36,1.50,1.50,materials.muzzleMetal??materials.barrel);
  device.userData.falMuzzleCombo=true;
  // A pair of broad simple dark port strokes, four triangles total.
  const verts:number[]=[],indices:number[]=[];
  for(const side of [-1,1] as const){
   const first=verts.length/3,z=side*.786;
   for(const [x,y] of [[19.03,-.23],[21.24,-.23],
                         [21.24,.23],[19.03,.23]])
    verts.push(x+shortDelta,y,z);
   if(side===1)indices.push(first,first+1,first+2,first,first+2,first+3);
   else indices.push(first,first+2,first+1,first,first+3,first+2);
  }
  const slotGeometry=new THREE.BufferGeometry();
  slotGeometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  slotGeometry.setIndex(indices);slotGeometry.computeVertexNormals();
  const slots=new THREE.Mesh(slotGeometry,materials.muzzleSlot??materials.barrel);
  slots.name='family-barrel-'+partIds.barrel+'-'+ids.barrel++;
  slots.userData.falMuzzleSlots=true;
  // A4.6: this pair is already batched into one geometry and conforms to
  // the real muzzle facets; do not replace it with two floating decals.
  slots.userData.surfaceDetailClass='fal-muzzle-ports';
  slots.userData.surfaceDetailFace='both';
  slots.castShadow=false;slots.receiveShadow=false;
  slots.renderOrder=3;root.add(slots);
 }
 // One tall FAL rear-sight blade seated INSIDE the upper roof.
 // Narrow enough to belong to the receiver rather than straddling the edges.
 const isPara=partIds.stock==='fal-para-folder';
 const rearSight=b('receiver',-5.00,isPara?1.94:2.18,0,
  .72,isPara?1.10:1.55,.90);
 rearSight.userData.falRearSight=true;
 // A small offset folding-handle representation: bent steel support with
 // long rearward horizontal polymer grip. Both solids physically overlap;
 // no AR-style upright arch, hollow box, hinges or screws. Factory enabled.
 if(options.raisedCarryHandle){
  addFALAngledCarrySupport(root,partIds.receiver,ids.receiver++,
   materials.receiver);
  // One giant RECTANGULAR handhold. No tiny chamfers or floating arch.
  const grip=addCuboid(root,'receiver',partIds.receiver,ids.receiver++,
   1.08,3.55,-1.61,4.08,1.05,1.15,materials.carryHandle??materials.stock);
  grip.userData.falCarryGrip=true;
 }
 // P7: trigger guard intentionally omitted; the negative space stays open.

 return root;
}
