/** OV visual assemblies. Geometry only: the established IK joints, shot transforms,
 * collisions and equipment ledger remain authoritative. Keep compact, readable
 * low-poly silhouettes for the isometric camera.
 */
import * as THREE from 'three';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {CarryLocation} from './equipment-carry-placement.ts';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';

type Slots=EquipmentLoadout['slots'];
type Material=THREE.MeshStandardMaterial;
type VisualMaterials={cloth:Material;vest:Material;dark:Material;
 skin:Material;steel:Material};
type Limb={upper:THREE.Mesh;lower:THREE.Mesh;shoe?:THREE.Mesh};
export type OperatorVisualKit={
 helmet:THREE.Group;cap:THREE.Group;hair:THREE.Group;
 haircuts:THREE.Group[];graphicMarks:THREE.Group;
 jacket:THREE.Group;lightShirt:THREE.Group;
 softArmor:THREE.Group;plateCarrier:THREE.Group;
 chestRig:THREE.Group;fieldWebbing:THREE.Group;
 belt:THREE.Group;dayPack:THREE.Group;fieldPack:THREE.Group;
 packHarness:THREE.Group;
 cargoPockets:THREE.Mesh[];bootCuffs:THREE.Mesh[];sleeveCuffs:THREE.Mesh[];
 rolledForearms:THREE.Mesh[];rolledCuffs:THREE.Mesh[];kneePanels:THREE.Mesh[];
 eyeMarks:THREE.Mesh[];hairMaterial:Material;
 magazines:Record<'rig'|'belt'|'pocket',THREE.Mesh[]>;
};
const part=(parent:THREE.Object3D,m:THREE.Material,
 x:number,y:number,z:number,w:number,h:number,d:number)=>{
 const mesh=new THREE.Mesh(mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d),m);
 mesh.position.set(x,y,z);
 mesh.castShadow=true;mesh.receiveShadow=true;
 parent.add(mesh);return mesh;
};
const bundle=(parent:THREE.Object3D)=>{const g=new THREE.Group();parent.add(g);return g;};
export function createOperatorVisualKit(
 chest:THREE.Group,hip:THREE.Group,head:THREE.Group,pack:THREE.Mesh,
 legs:readonly Limb[],arms:readonly Limb[],m:VisualMaterials):OperatorVisualKit{
 const {cloth,vest,dark,skin,steel}=m;
 const trim=new THREE.MeshStandardMaterial({color:0x777d6d,roughness:.94,flatShading:true});
 const seam=new THREE.MeshStandardMaterial({color:0x303b36,roughness:.95,flatShading:true});
 const hairMaterial=new THREE.MeshStandardMaterial({color:0x302d29,roughness:1,flatShading:true});
 // +X is forward. The head is intentionally chunky; no anatomical joint
 // translations or scale changes occur in this visual pass.
 const hair=bundle(head);
 const haircuts=[bundle(hair),bundle(hair),bundle(hair)];
 // Short crop: squared crown and nape.
 part(haircuts[0],hairMaterial,-.45,7.1,0,8.25,1.2,8.5);
 part(haircuts[0],hairMaterial,-3.5,4.8,0,1.1,2.1,7.9);
 // Side part: a slightly uneven front, kept below the helmet silhouette.
 part(haircuts[1],hairMaterial,-1.2,7.2,0,7.9,1.35,8.3);
 part(haircuts[1],hairMaterial,2.35,6.7,-1.0,2.5,1.05,5.0);
 // Close-cut buzz: barely raised upper head with clear exposed temples.
 part(haircuts[2],hairMaterial,-.55,7.05,0,7.7,.53,8.1);
 // Small low-contrast eye slashes, no attached cube nose or floating mouth.
 // At gameplay distance the face reads as a quiet plane beneath the brow.
 const face=bundle(head);
 const facialInk=new THREE.MeshStandardMaterial({
  color:0x564a40,roughness:1,flatShading:true});
 const eyeMarks=[
  part(face,facialInk,4.15,3.45,-2,.15,.24,.9),
  part(face,facialInk,4.15,3.45,2,.15,.24,.9)];
 const graphicMarks=bundle(head);
 part(graphicMarks,facialInk,4.155,3.5,-2,.15,.50,1.15);
 part(graphicMarks,facialInk,4.155,3.5,2,.15,.50,1.15);
 graphicMarks.visible=false;
 // An angular helmet shell: broad temple coverage, smaller crown, short
 // side rails, and close-fitting retention instead of dangling ear blocks.
 const helmet=bundle(head);
 part(helmet,vest,-.5,6.25,0,9.0,2.25,9.2);
 part(helmet,vest,-.9,7.65,0,7.8,1.4,8.25);
 part(helmet,vest,-1.8,4.75,0,7.1,2.0,8.8);
 part(helmet,dark,3.65,5.6,0,1.15,.85,9.0);
 for(const sign of [-1,1]){
  part(helmet,vest,-2.15,3.5,sign*4.25,3.7,2.6,1.0);
  part(helmet,dark,-1.4,4.7,sign*4.8,3.4,.65,.45);
  part(helmet,seam,-1.7,1.45,sign*4.3,.65,2.1,.4);
 }
 part(helmet,seam,-1.6,.35,0,1.15,.5,6.5);
 part(helmet,trim,-1.2,8.45,0,2.0,.28,2.5);
 // Soft cap should look soft and low-profile, not another ballistic shell.
 const cap=bundle(head);
 part(cap,cloth,-.45,6.85,0,8.1,1.2,8.25);
 part(cap,cloth,-1.0,7.5,0,6.6,.85,7.3);
 part(cap,cloth,4.35,5.92,0,4.2,.46,7.8);
 // Separate clothing profiles: jacket has a heavier collar, flap and
 // squared hem; the shirt exposes a narrow collar instead of extra panels.
 const jacket=bundle(chest);
 for(const sign of [-1,1]){
  part(jacket,cloth,3.2,5.95,sign*4.0,3.0,1.55,4.0);
  part(jacket,cloth,4.95,-2,sign*3.6,.44,3.8,2.55);
  part(jacket,trim,5.22,3.0,sign*3.05,.38,1.45,3.15);
 }
 part(jacket,cloth,5.18,-5.55,0,.64,1.15,13.6);
 part(jacket,trim,5.51,-.5,0,.24,6,.6);
 const lightShirt=bundle(chest);
 part(lightShirt,trim,2.2,5.95,-2.35,2.5,.72,3.1);
 part(lightShirt,trim,2.2,5.95,2.35,2.5,.72,3.1);
 // Body armor remains enclosed rather than coplanar: a low-profile soft
 // vest and a larger, boxy pair of front/back ballistic plate bags.
 const softArmor=bundle(chest);
 part(softArmor,vest,5.75,-.5,0,1.85,9.4,12.15);
 part(softArmor,vest,-5.72,-.5,0,1.9,9.2,12.15);
 for(const sign of [-1,1]){
  part(softArmor,vest,-.15,4.55,sign*6.38,10.0,1.7,1.3);
  part(softArmor,trim,6.71,-3.55,sign*3.2,.23,.7,4.4);
 }
 const plateCarrier=bundle(chest);
 for(const x of [-6.4,6.4]){
  part(plateCarrier,vest,x,.35,0,2.5,10.05,12.9);
  // Exterior sewn panel, not at the exact same depth as the plate surface.
  part(plateCarrier,trim,x+(x>0?1.36:-1.36),-3.9,0,.22,1.05,11.5);
  part(plateCarrier,dark,x+(x>0?1.4:-1.4),2.85,0,.2,.55,8.7);
 }
 for(const sign of [-1,1]){
  part(plateCarrier,vest,-.15,5.85,sign*5.45,10.6,1.65,2.35);
  part(plateCarrier,dark,-.45,-.95,sign*7.1,9.7,2.1,.75);
 }
 const chestRig=bundle(chest),fieldWebbing=bundle(chest);
 // Light rig = two vertical straps with a low chest organizer.
 for(const sign of [-1,1])
  part(chestRig,trim,5.95,3.3,sign*4.4,1.0,5.25,1.45);
 part(chestRig,dark,6.15,-2.15,0,.75,1.25,12.7);
 // Full field webbing is deliberately a REPLACEMENT, never two stacked rigs.
 for(const sign of [-1,1]){
  part(fieldWebbing,trim,5.95,2.9,sign*4.75,1.45,5.8,1.85);
  part(fieldWebbing,vest,-.4,-.5,sign*7.4,8.6,1.45,.72);
 }
 part(fieldWebbing,dark,6.25,-3.1,0,.85,1.65,13.8);
 const belt=bundle(hip);
 part(belt,dark,0,-2.0,0,8.75,1.5,13.15);
 part(belt,steel,4.6,-2.0,0,.65,1.9,2.4);
 for(const z of [-5.5,5.5])
  part(belt,trim,0,-2.0,z,.8,2.5,.85);
 // The existing pack mesh remains the inertia parent, preserving the exact
 // existing animation. These are surface details, not new physics bodies.
 const dayPack=bundle(pack),fieldPack=bundle(pack);
 // Harness rides with the chest rather than hanging off the animated pack.
 // Its rear end visually meets the bag, while leaving the actual IK alone.
 const packHarness=bundle(chest);
 for(const sign of [-1,1]){
  part(packHarness,trim,-.5,5.25,sign*5.4,8.1,.65,1.1);
  part(packHarness,dark,-4.35,-1.7,sign*6.1,3.35,1.0,.75);
 }
 // Pack parent follows existing inertial motion; visible day/field bags are
 // complete distinct silhouettes, not scale variations of the same cube.
 part(dayPack,vest,0,.7,0,5.0,8.1,10.2);
 part(dayPack,dark,-2.63,-2.0,0,.3,1.0,8.0);
 for(const sign of [-1,1])
  part(dayPack,trim,-2.68,1.7,sign*3.45,.24,5.0,.65);
 part(fieldPack,vest,-.55,.45,0,6.3,14.2,13.15);
 part(fieldPack,trim,-3.8,5.5,0,.4,2.0,11.4);
 part(fieldPack,dark,-3.8,-4.4,0,.42,1.25,10.6);
 for(const sign of [-1,1]){
  part(fieldPack,vest,-1.5,-2.8,sign*7.75,3.65,6.3,2.3);
  part(fieldPack,trim,-2.9,1.4,sign*6.65,.6,8.8,.65);
 }
 const cargoPockets:THREE.Mesh[]=[],bootCuffs:THREE.Mesh[]=[],sleeveCuffs:THREE.Mesh[]=[];
 const rolledForearms:THREE.Mesh[]=[],rolledCuffs:THREE.Mesh[]=[],kneePanels:THREE.Mesh[]=[];
 for(const leg of legs){
  // Thin, leg-mounted pieces follow the solved IK. No additional leg length.
  cargoPockets.push(part(leg.upper,cloth,0,0.08,3.0,3.3,.29,1.45));
  kneePanels.push(part(leg.lower,trim,0,.36,2.25,3.7,.22,1.2));
  if(leg.shoe)bootCuffs.push(part(leg.shoe,dark,-1.55,1.5,0,4.1,1.55,5.0));
 }
 for(const arm of arms){
  sleeveCuffs.push(part(arm.lower,trim,0,-.36,0,3.65,.13,3.75));
  // A rolled sleeve exposes the outer forearm as geometry above its cloth
  // bone. The shared IK still positions both arms exactly as before.
  rolledForearms.push(part(arm.lower,skin,0,.22,0,3.55,.52,3.65));
  rolledCuffs.push(part(arm.lower,cloth,0,-.13,0,3.9,.12,3.9));
 }
 const magazines:{rig:THREE.Mesh[];belt:THREE.Mesh[];pocket:THREE.Mesh[]}={
  rig:[],belt:[],pocket:[]};
 for(let i=0;i<7;i++){
  const row=i<4?0:1,at=row?i-4:i;
  const z=(at-(row?1:1.5))*(row?3.7:3.1);
  const mag=part(chest,dark,7.75,row?-6.55:-2,z,2.0,4.1,2.05);
  part(mag,trim,0,.42,0,2.05,.36,2.1);
  magazines.rig.push(mag);
 }
 for(let i=0;i<3;i++){
  const mag=part(hip,dark,3,-4.0,(i-1)*4.6,2.0,3.5,2.2);
  magazines.belt.push(mag);
 }
 magazines.pocket.push(part(hip,dark,-1.6,-4.25,6,2.0,3.2,2.15));
 for(const mesh of [...magazines.rig,...magazines.belt,...magazines.pocket])
  mesh.visible=false;
 // Static layered clothing/armor/pack geometry becomes a few multi-face
 // meshes per material. Keep individually issued magazines unmerged.
 for(const surface of [helmet,cap,hair,jacket,lightShirt,softArmor,
  plateCarrier,chestRig,fieldWebbing,belt,dayPack,fieldPack,packHarness])
   consolidateVisualGroup(surface);
 return {helmet,cap,hair,jacket,lightShirt,softArmor,plateCarrier,chestRig,
  fieldWebbing,belt,dayPack,fieldPack,packHarness,cargoPockets,bootCuffs,sleeveCuffs,
  rolledForearms,rolledCuffs,kneePanels,eyeMarks,hairMaterial,magazines,
  haircuts,graphicMarks};
}
const DEFAULT:Slots={
 primary:'primary-carbine',head:'head-helmet',armor:'armor-soft',
 rig:'rig-light',belt:'belt-standard',backpack:'backpack-day',
 top:'top-uniform',legs:'legs-field',hands:'hands-gloves',feet:'feet-boots',
 medical:'medical-basic',tactical:'tactical-flash',utility:'utility-radio'
};
export function applyOperatorVisualKit(v:OperatorVisualKit,
 slots:Slots|undefined,seed:number,magazineLocations:readonly CarryLocation[]=[],
 faceStyle:'blank'|'quiet'|'graphic'='quiet'){
 const s=slots??DEFAULT;
 v.helmet.visible=s.head==='head-helmet';
 v.cap.visible=s.head==='head-cap';
 v.hair.visible=s.head==='head-none';
 v.haircuts.forEach((h,i)=>{h.visible=i===(seed>>>2)%3;});
 v.eyeMarks.forEach(m=>{m.visible=faceStyle==='quiet';});
 v.graphicMarks.visible=faceStyle==='graphic';
 v.softArmor.visible=s.armor==='armor-soft';
 v.plateCarrier.visible=s.armor==='armor-carrier';
 v.jacket.visible=s.top==='top-uniform';
 v.lightShirt.visible=s.top==='top-light';
 v.chestRig.visible=s.rig==='rig-light';
 v.fieldWebbing.visible=s.rig==='rig-full';
 // Positive-X is outward/front. Armor layers define the bearing surface,
 // eliminating intersecting and coplanar webbing/plate details.
 const armorOffset=s.armor==='armor-carrier'?1.95:
  s.armor==='armor-soft'?1.15:0;
 v.chestRig.position.x=armorOffset;
 v.fieldWebbing.position.x=armorOffset;
 v.belt.visible=true;
 v.belt.scale.set(1,s.belt==='belt-light'?.72:1,1);
 v.dayPack.visible=s.backpack==='backpack-day';
 v.fieldPack.visible=s.backpack==='backpack-field';
 v.packHarness.visible=s.backpack!=='backpack-none';
 for(const pocket of v.cargoPockets)pocket.visible=s.legs==='legs-field';
 for(const cuff of v.bootCuffs)cuff.visible=s.feet==='feet-boots';
 for(const cuff of v.sleeveCuffs)cuff.visible=s.top==='top-uniform';
 for(const mesh of v.rolledForearms)mesh.visible=s.top==='top-light';
 for(const mesh of v.rolledCuffs)mesh.visible=s.top==='top-light';
 for(const mesh of v.kneePanels)mesh.visible=s.legs==='legs-field';
 const hairs=[0x332e29,0x635244,0x2f3530,0x9b8060,0x4d4136,0x6c6255];
 v.hairMaterial.color.setHex(hairs[(seed>>>5)%hairs.length]);
 const magShape=s.primary==='primary-smg'?
  {x:.73,y:1.17,z:.86}:s.primary==='primary-rifle'?
  {x:1.1,y:1.06,z:1.04}:
  {x:1,y:1,z:1};
 // Stowaway magazines sit outside the *outermost* protection layer.
 const surfaceX=s.armor==='armor-carrier'?10.25:
   s.armor==='armor-soft'?9.05:7.15;
 v.magazines.rig.forEach(m=>{m.position.x=surfaceX;});
 for(const loc of ['rig','belt','pocket'] as const){
  let count=magazineLocations.filter(x=>x===loc).length;
  // Backpacks do not display imaginary accessible chest magazines.
  if(loc==='rig'&&s.rig==='rig-none')count=0;
  if(loc==='rig'&&s.rig==='rig-light')count=Math.min(4,count);
  if(loc==='belt'&&s.belt==='belt-light')count=Math.min(1,count);
  v.magazines[loc].forEach((m,i)=>{
   m.visible=i<count;
   m.scale.set(magShape.x,magShape.y,magShape.z);
  });
 }
}
