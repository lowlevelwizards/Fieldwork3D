/** G36 P6 — Fieldwork's original full-length G36, interpreted as a
 * deliberate miniature. Do not trace molded manufacture or add micro-steps.
 * Every component is one primary silhouette plus at most one identity cue.
 * This is the actual production builder, not a separate art preview.
 */
import * as THREE from 'three';
import {addOutline,addCuboid,addProfileFrame,
 type Outline,type SlotName} from './profile-primitives.ts';
import {G36_B_ART as A} from './g36-art-layout.ts';
import {G36_B_PART_IDS} from './g36-family-contract.ts';
import {G36_MAG30_OUTLINE,G36_MAG30_OUTLINE_CANDIDATE,G36_MAG30_DEPTH} from './g36-magazine-profiles.ts';
import {addG36H3FactoryHandguard} from './g36-h3-handguard.ts';
import {addHKSelectorLeverArt} from './hk-trigger-selector.ts';
import {addG36SEFIndexMarks} from './weapon-pixel-detail.ts';
import {addG36O2DualOptic} from './g36-dual-optic-o2.ts';

export {G36_B_PART_IDS} from './g36-family-contract.ts';

/** Review-only visual alternatives, all use the same real factory geometry.
 * They never become save data, alternate weapon presets or accessory slots.
 * The rear-biased reflex is the selected production interpretation; P6
 * remains an explicit reference in the review lab.
 */
export type G36OpticArtReview='p6'|'lower-emphasis'|'rear-integrated';
export type G36ArtReview=Readonly<{optic?:G36OpticArtReview;magazine?:'p6'|'curve'}>;
type Prism=readonly [number,number,number,number,number,number];
type OpticForms=Readonly<{lower:Prism;upper:Prism;lowerFace:Prism;upperFace:Prism}>;
export const G36_OPTIC_REVIEW_FORMS:Readonly<Record<G36OpticArtReview,OpticForms>>=Object.freeze({
 p6:{
  lower:[-3.37,3.35,0,4.95,1.30,1.96],
  upper:[-3.63,4.31,0,2.35,.78,1.78],
  lowerFace:[-.86,3.57,0,.22,.94,1.16],
  upperFace:[-2.41,4.32,0,.22,.70,1.18]
 },
 'lower-emphasis':{
  // A: make the magnified housing dominate in height, without a taller tower.
  lower:[-3.37,3.25,0,4.95,1.48,1.96],
  upper:[-3.63,4.31,0,2.35,.78,1.78],
  lowerFace:[-.86,3.51,0,.22,1.05,1.16],
  upperFace:[-2.41,4.32,0,.22,.70,1.18]
 },
 'rear-integrated':{
  // B: shift only the upper reflex rearward to sit in the handle's rear crown.
  lower:[-3.37,3.35,0,4.95,1.30,1.96],
  upper:[-4.11,4.31,0,2.20,.78,1.78],
  lowerFace:[-.86,3.57,0,.22,.94,1.16],
  upperFace:[-2.96,4.32,0,.22,.70,1.18]
 }
});

function area(poly:Outline):number{
 return poly.reduce((sum,p,i)=>{
  const q=poly[(i+1)%poly.length];return sum+p[0]*q[1]-q[0]*p[1];
 },0);
}
function contour(poly:Outline,ccw:boolean):Outline{
 return (area(poly)>0)===ccw?poly:[...poly].reverse();
}
/** V13: reference-derived original G36 folding stock, not a revised P8 frame.
 * This is the user-approved photo-derived silhouette mirrored into game art
 * coordinates (+X muzzle, +Y up). A single solid molded frame has two actual
 * through-openings; the rear heel sweeps steeply below a shallow lower rail.
 * Preserve the factory stock mount/rear extent and restrained 1.72-unit depth.
 * The rear upper corner overlaps the pre-existing slim buttpad on purpose.
 */
function addTwoOpeningStock(root:THREE.Group,material:THREE.Material,n:number):THREE.Mesh{
 const outside:Outline=[
  [-6.568,1.200],[-6.430,-1.555],[-6.831,-1.877],
  [-9.527,-1.936],[-11.628,-2.445],
  [-13.397,-4.055],[-13.736,-5.233],[-14.379,-5.250],
  [-14.690,-4.970],[-14.640,.259],[-8.773,.403]
 ];
 const largeHole:Outline=[
  [-10.045,-.317],[-13.515,-.292],[-13.480,-1.758],
  [-13.024,-2.106],[-10.066,-1.300]
 ];
 const smallHole:Outline=[
  [-7.958,-.334],[-9.444,-.309],[-9.534,-1.097],[-7.958,-1.190]
 ];
 const trace=(poly:Outline,path:THREE.Shape|THREE.Path)=>{
  path.moveTo(poly[0][0],poly[0][1]);
  for(const [x,y] of poly.slice(1))path.lineTo(x,y);
  path.closePath();
 };
 const shape=new THREE.Shape();
 trace(contour(outside,true),shape);
 for(const hole of [largeHole,smallHole]){
  const opening=new THREE.Path();trace(contour(hole,false),opening);
  shape.holes.push(opening);
 }
 const geom=new THREE.ExtrudeGeometry(shape,{
  depth:1.72,steps:1,bevelEnabled:false,curveSegments:1
 });
 geom.translate(0,0,-.86);
 const mesh=new THREE.Mesh(geom,material);
 mesh.name='family-stock-'+G36_B_PART_IDS.stock+'-'+n;
 mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.userData.g36MasterStock=true;
 mesh.userData.g36StockOpeningCount=2;
 mesh.userData.g36StockArtVersion='v13-reference';
 root.add(mesh);return mesh;
}
export function buildG36OriginalBlockout(material:THREE.Material,review:G36ArtReview={}):THREE.Group{
 const root=new THREE.Group();
 root.name='g36-p7-calibrated-fieldwork-master';
 const i:Record<SlotName,number>={
  stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0
 };
 const ids=G36_B_PART_IDS;
 const outline=(slot:SlotName,pts:Outline,depth:number)=>
  addOutline(root,slot,ids[slot],i[slot]++,pts,depth,material);
 const box=(slot:SlotName,x:number,y:number,z:number,w:number,h:number,d:number)=>
  addCuboid(root,slot,ids[slot],i[slot]++,x,y,z,w,h,d,material);

 addTwoOpeningStock(root,material,i.stock++);
 const pad=outline('stock',[
  [-15.05,.40],[-14.63,.40],[-14.63,-5.04],[-15.05,-5.22]
 ],1.44);
 pad.userData.g36Buttpad=true;
 const hinge=box('stock',-6.64,-.74,0,.84,2.43,1.80);
 hinge.userData.g36StockHinge=true;

 // R2: broad six-point upper; the tapered nose deliberately tucks behind
 // H3's existing six-sided guard. Roof/front overlap closes the old V-notch
 // without an extra sleeve, overlap ring, spacer or chamfer.
 const upper=outline('receiver',[
  [-6.80,1.27],[-6.30,1.49],[4.42,1.49],
  [4.90,.70],[4.90,-1.49],[-6.80,-1.49]
 ],2.50);
 upper.userData.g36ReceiverUpper=true;
 upper.userData.g36ReceiverArtVersion='r2-broad-interlocking-upper';
 // R3: the magwell has precisely THREE graphic outside relationships:
 // (1) straight vertical REAR (-1.70 at both heights), (2) bottom drops
 // toward the rear, and (3) an angled FRONT. One eight-corner lower
 // extrusion retains the open trigger gap and 5.56 magazine clearances.
 // The 3.32-wide magazine center x=.45 extends x [-1.21,2.11],
 // leaving .49 behind and >.5 at the well front (y=-3.0).
 const lower=outline('receiver',[
  [-6.35,-1.28],[4.05,-1.28],[2.72,-3.13],
  [-1.70,-3.49],[-1.70,-2.18],[-3.78,-2.17],
  [-4.28,-3.43],[-6.35,-2.18]
 ],2.28);
 lower.userData.g36MagwellArtVersion='r3-556-vertical-rear';
 lower.userData.g36MagwellMouthWidth=4.42;
 lower.userData.g36MagwellRearX=-1.70;
 lower.userData.g36MagwellDepth=2.28;
 lower.userData.g36ReceiverLower=true;
 lower.userData.g36OpenTriggerGap=true;

 // A single large, clean, genuinely hollow integrated carry handle.
 // NO relief chamfers, arbitrary roof segments or decorative cover plates.
 const outside:Outline=[
  [-5.76,1.35],[-5.12,4.05],[5.28,4.05],
  [7.42,2.69],[7.42,1.35]
 ];
 const inside:Outline=[
  [-3.50,1.92],[-3.04,3.13],[5.01,3.13],
  [6.87,2.32],[6.87,1.92]
 ];
 const bridge=addProfileFrame(root,'receiver',ids.receiver,i.receiver++,
  contour(outside,true),contour(inside,false),1.50,material);
 bridge.userData.g36HandleOpening=true;

 // O2 production: user-approved 125 / 125 / 55 six-facet optical pod.
 // The two rear-facing eyepieces are true low-facet volumetric cylinders.
 // Historical P6/P7 presets are review-only alternatives, not save data.
 if(!review.optic){
  i.receiver=addG36O2DualOptic(root,material,ids.receiver,i.receiver);
 }else{
  const optics=G36_OPTIC_REVIEW_FORMS[review.optic];
  const magnified=box('receiver',...optics.lower);
  magnified.userData.g36LowerOptic=true;
  magnified.userData.g36IntegratedOpticShell=true;
  const reflex=box('receiver',...optics.upper);
  reflex.userData.g36UpperReflex=true;
  const bigLens=box('receiver',...optics.lowerFace);
  bigLens.userData.g36OpticFace=true;
  const smallLens=box('receiver',...optics.upperFace);
  smallLens.userData.g36UpperReflexWindow=true;
 }

 // One strongly rear-raked HK polymer wedge, no trigger guard.
 // Maintain the primary-hand landmark (-4.65,-4.10) inside its projected face.
 const grip=outline('grip',[
  [-5.70,-2.12],[-3.39,-2.12],[-4.60,-5.72],[-6.25,-5.72]
 ],2.02);
 grip.userData.g36Grip=true;

 // The G36 charge handle is a transverse top cocking tab, NOT the side
 // ejection port. It now sits at the FRONT of the upper under the empty
 // handle bridge, above the receiver roof with a shallow root overlap.
 // One six-faced cube, no separate pivot, bolt carrier or fictional rail.
 const charging=box('receiver',2.25,1.63,0,1.20,.40,3.14);
 charging.userData.g36ChargingHandle=true;
 charging.userData.g36ChargePosition='r2-front-top-under-handle';

 // HK's G36 was offered with a genuine SEF trigger group as well as
 // pictograms. Restore the selector's rear/down pivot near the top of
 // the grip while preserving two-sided factory controls and six facets.
 // One batched four-triangle white S / red E-F graphic survives finish swaps.
 for(const side of [-1,1] as const){
  const [hub,lever]=addHKSelectorLeverArt(root,-5.20,-1.96,1.14,side,material,6);
  hub.name='family-receiver-'+ids.receiver+'-'+i.receiver++;
  lever.name='family-receiver-'+ids.receiver+'-'+i.receiver++;
  hub.userData.g36SelectorHub=true;
  lever.userData.g36SelectorLever=true;
 }
 // R5: F/E left of the pivot, S to its right, matching the HK grip.
 // All letters fit ABOVE the imaginary trigger-guard boundary on the
 // same receiver side face; neither E nor F sinks through the grip.
 // Retain just one cached 12-triangle double-sided letter mesh.
 const selectorMarks=addG36SEFIndexMarks(root);
 selectorMarks.name='family-receiver-'+ids.receiver+'-'+i.receiver++;
 selectorMarks.userData.g36SelectorMarkings=true;
 selectorMarks.userData.g36SelectorMarkCount=2;
 selectorMarks.userData.g36SelectorArtVersion='r5-sef-trigger-housing';

 const mag=outline('magazine',review.magazine==='curve'?G36_MAG30_OUTLINE_CANDIDATE:G36_MAG30_OUTLINE,G36_MAG30_DEPTH);
 mag.userData.g36Magazine=true;

 // H3: ONE capped six-sided solid, angled at both ends.
 // Keep four vents in the existing shared atlas, not added geometry.
 const guard=addG36H3FactoryHandguard(root,ids.handguard,i.handguard++,material);
 guard.userData.g36LongHandguard=true;

 // R3: ONE integrated eight-corner flash-hider silhouette, NOT a blunt
 // square cap or a stack of collar/ring meshes. Collar bulges at x=18.26,
 // then narrows into the long working body while remaining slightly
 // thicker than the 1.14-wide barrel. Two graphic side slots come from
 // the ALREADY pooled G36 atlas and need ZERO additional triangles.
 const barrel=box('barrel',16.12,0,0,5.90,1.14,1.14);
 barrel.userData.g36Barrel=true;
 const muzzle=outline('barrel',[
  [17.85,.60],[18.26,.77],[18.51,.64],
  [A.muzzleX,.64],[A.muzzleX,-.64],
  [18.51,-.64],[18.26,-.77],[17.85,-.60]
 ],1.42);
 muzzle.userData.g36FactoryMuzzle=true;
 muzzle.userData.g36MuzzleArtVersion='r3-faceted-flash-hider';
 return root;
}

export type G36FactoryMaterials=Readonly<{
 polymer:THREE.Material;steel:THREE.Material;magazine:THREE.Material;
 buttpad:THREE.Material;optic:THREE.Material;muzzle:THREE.Material;
 /** Optional for legacy P6/P7 lab / tests; supplied in O3 live factory. */
 opticRim?:THREE.Material;lens?:THREE.Material
}>;
/** One shared finish per meaningful material. No material allocations here. */
export function applyG36FactoryMaterials(root:THREE.Group,finishes:G36FactoryMaterials):void{
 for(const child of root.children){
  if(!(child instanceof THREE.Mesh))continue;
  // Shared factory fire-mode pictograms carry their OWN cached atlas finish.
  if(child.userData.g36SelectorMarkings)continue;
  let result:THREE.Material=finishes.polymer;
  if(child.userData.g36Magazine)result=finishes.magazine;
  else if(child.userData.g36Buttpad||child.userData.g36SelectorHub||
   child.userData.g36SelectorLever)result=finishes.buttpad;
  else if(child.userData.g36FactoryMuzzle)result=finishes.muzzle;
  else if(child.userData.g36Barrel||child.userData.g36StockHinge||
   child.userData.g36ChargingHandle)result=finishes.steel;
  // One optical *housing* finish shared with the receiver and handle.
  // Separate dark lens aperture from subtle rim; no painted-on micro rings.
  else if(child.userData.g36OpticFace||child.userData.g36UpperReflexWindow)
   result=finishes.lens??finishes.buttpad;
  else if(child.userData.g36LowerOpticBarrel||child.userData.g36UpperReflexBarrel)
   result=finishes.opticRim??finishes.optic;
  else if(child.userData.g36UpperReflex||child.userData.g36LowerOptic)
   result=finishes.optic;
  child.material=result;
 }
}
