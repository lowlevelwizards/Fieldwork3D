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
 jacket:THREE.Group;lightShirt:THREE.Group;
 softArmor:THREE.Group;plateCarrier:THREE.Group;
 chestRig:THREE.Group;fieldWebbing:THREE.Group;
 belt:THREE.Group;dayPack:THREE.Group;fieldPack:THREE.Group;
 cargoPockets:THREE.Mesh[];bootCuffs:THREE.Mesh[];sleeveCuffs:THREE.Mesh[];
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
 part(hair,hairMaterial,0,7.1,0,8.3,1.35,8.35);
 part(hair,hairMaterial,-3.2,4.5,-3.5,1.5,3.2,1.4);
 part(hair,hairMaterial,-3.2,4.5,3.5,1.5,3.2,1.4);
 const face=bundle(head);
 const eyeMarks=[
  part(face,seam,4.18,3.6,-2,0.32,.52,.85),
  part(face,seam,4.18,3.6,2,0.32,.52,.85)];
 part(face,skin,4.48,2.55,0,.85,1.15,1.2);
 const helmet=bundle(head);
 part(helmet,vest,-.25,7.25,0,9.9,2.15,9.9);
 part(helmet,vest,-2.25,4.3,-3.8,4.8,3.15,2.25);
 part(helmet,vest,-2.25,4.3,3.8,4.8,3.15,2.25);
 part(helmet,dark,4.5,5.25,0,2,1.05,10.1);
 part(helmet,seam,-2.2,0.45,-4.65,1,4.1,.58);
 part(helmet,seam,-2.2,0.45,4.65,1,4.1,.58);
 part(helmet,dark,1.7,-1.35,0,1.5,.55,7.15);
 part(helmet,trim,-2,8.55,0,3,.42,4.3);
 const cap=bundle(head);
 part(cap,cloth,-.25,7.0,0,8.55,1.8,8.65);
 part(cap,cloth,4.55,5.9,0,5.4,.7,8.35);
 part(cap,trim,-.3,6.9,0,8.65,.32,8.8);
 const jacket=bundle(chest);
 part(jacket,cloth,4.95,-2.0,-3.6,.42,4,2.4);
 part(jacket,cloth,4.95,-2.0,3.6,.42,4,2.4);
 part(jacket,cloth,1.7,5.65,-3.5,4.2,1.35,4.7);
 part(jacket,cloth,1.7,5.65,3.5,4.2,1.35,4.7);
 part(jacket,trim,5.15,-.5,0,.22,6,.55);
 const lightShirt=bundle(chest);
 part(lightShirt,trim,1.6,5.65,-3.0,4.2,.75,4.0);
 part(lightShirt,trim,1.6,5.65,3.0,4.2,.75,4.0);
 const softArmor=bundle(chest);
 part(softArmor,vest,5.1,-.5,0,2.4,8.4,11.2);
 part(softArmor,vest,-5.1,-.5,0,2.3,8.4,11.2);
 part(softArmor,vest,-.2,5.0,-5.35,7.6,2.0,2.1);
 part(softArmor,vest,-.2,5.0,5.35,7.6,2.0,2.1);
 const plateCarrier=bundle(chest);
 for(const x of [-5.55,5.55]){
  part(plateCarrier,vest,x,.2,0,2.6,9.8,11.6);
  part(plateCarrier,trim,x+(x>0?.05:-.05),-3.7,0,2.8,1.1,11.6);
 }
 for(const z of [-5.2,5.2]){
  part(plateCarrier,vest,-.25,5.65,z,9.6,2.0,2.75);
  part(plateCarrier,dark,-.15,-1.5,z>0?7.05:-7.05,8.6,3.45,.8);
 }
 part(plateCarrier,trim,7.1,3.4,0,.25,1.2,6.2);
 const chestRig=bundle(chest),fieldWebbing=bundle(chest);
 for(const z of [-4.2,4.2]){
  part(chestRig,trim,4.55,3.2,z,1.15,5.2,1.6);
  part(fieldWebbing,trim,5.0,3.0,z,1.25,5.8,1.7);
  part(fieldWebbing,vest,-.8,-.4,z>0?7.35:-7.35,7.2,1.6,.9);
 }
 part(chestRig,trim,5.0,-2.2,0,1.2,1.4,12.5);
 part(fieldWebbing,trim,5.25,-3.0,0,1.4,1.5,13.3);
 const belt=bundle(hip);
 part(belt,dark,0,-2.0,0,8.75,1.5,13.15);
 part(belt,steel,4.6,-2.0,0,.65,1.9,2.4);
 for(const z of [-5.5,5.5])
  part(belt,trim,0,-2.0,z,.8,2.5,.85);
 // The existing pack mesh remains the inertia parent, preserving the exact
 // existing animation. These are surface details, not new physics bodies.
 const dayPack=bundle(pack),fieldPack=bundle(pack);
 part(dayPack,vest,-.57,1.45,0,1.0,3.5,8.5);
 part(dayPack,dark,-.62,-2.25,0,1.05,.7,7.2);
 for(const z of [-3.7,3.7])
  part(dayPack,trim,-.6,0,z,.6,7,.85);
 part(fieldPack,vest,-.75,1.7,0,1.8,6.2,10.0);
 part(fieldPack,dark,-.95,-2.8,0,1.2,1.2,10.1);
 for(const z of [-4.5,4.5])
  part(fieldPack,vest,-1.25,-1.2,z,2.1,5,2.6);
 for(const z of [-4.5,4.5])
  part(fieldPack,trim,-1.58,2.7,z,.4,1,2.7);
 const cargoPockets:THREE.Mesh[]=[],bootCuffs:THREE.Mesh[]=[],sleeveCuffs:THREE.Mesh[]=[];
 for(const leg of legs){
  // Children follow the existing bone quaternion and length scaling.
  cargoPockets.push(part(leg.upper,cloth,0,0.08,3.0,3.3,.29,1.45));
  if(leg.shoe)bootCuffs.push(part(leg.shoe,dark,-1.55,1.5,0,4.1,1.55,5.0));
 }
 for(const arm of arms)
  sleeveCuffs.push(part(arm.lower,trim,0,-.36,0,3.65,.13,3.75));
 const magazines:{rig:THREE.Mesh[];belt:THREE.Mesh[];pocket:THREE.Mesh[]}={
  rig:[],belt:[],pocket:[]};
 for(let i=0;i<4;i++){
  const z=(i-1.5)*3.1;
  const mag=part(chest,dark,7.75,-2,z,2.0,4.7,2.05);
  part(mag,trim,0,.48,0,2.05,.36,2.1);
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
  plateCarrier,chestRig,fieldWebbing,belt,dayPack,fieldPack])
   consolidateVisualGroup(surface);
 return {helmet,cap,hair,jacket,lightShirt,softArmor,plateCarrier,chestRig,
  fieldWebbing,belt,dayPack,fieldPack,cargoPockets,bootCuffs,sleeveCuffs,
  eyeMarks,hairMaterial,magazines};
}
const DEFAULT:Slots={
 primary:'primary-carbine',head:'head-helmet',armor:'armor-soft',
 rig:'rig-light',belt:'belt-standard',backpack:'backpack-day',
 top:'top-uniform',legs:'legs-field',hands:'hands-gloves',feet:'feet-boots',
 medical:'medical-basic',tactical:'tactical-flash',utility:'utility-radio'
};
export function applyOperatorVisualKit(v:OperatorVisualKit,
 slots:Slots|undefined,seed:number,magazineLocations:readonly CarryLocation[]=[]){
 const s=slots??DEFAULT;
 v.helmet.visible=s.head==='head-helmet';
 v.cap.visible=s.head==='head-cap';
 v.hair.visible=s.head==='head-none';
 v.softArmor.visible=s.armor==='armor-soft';
 v.plateCarrier.visible=s.armor==='armor-carrier';
 v.jacket.visible=s.top==='top-uniform';
 v.lightShirt.visible=s.top==='top-light';
 v.chestRig.visible=s.rig==='rig-light'||s.rig==='rig-full';
 v.fieldWebbing.visible=s.rig==='rig-full';
 v.belt.visible=true;
 v.belt.scale.set(1,s.belt==='belt-light'?.72:1,1);
 v.dayPack.visible=s.backpack==='backpack-day';
 v.fieldPack.visible=s.backpack==='backpack-field';
 for(const pocket of v.cargoPockets)pocket.visible=s.legs==='legs-field';
 for(const cuff of v.bootCuffs)cuff.visible=s.feet==='feet-boots';
 for(const cuff of v.sleeveCuffs)cuff.visible=s.top==='top-uniform';
 const hairs=[0x332e29,0x635244,0x2f3530,0x9b8060,0x4d4136,0x6c6255];
 v.hairMaterial.color.setHex(hairs[(seed>>>5)%hairs.length]);
 for(const loc of ['rig','belt','pocket'] as const){
  let count=magazineLocations.filter(x=>x===loc).length;
  // Backpacks do not display imaginary accessible chest magazines.
  if(loc==='rig'&&s.rig==='rig-none')count=0;
  if(loc==='belt'&&s.belt==='belt-light')count=Math.min(1,count);
  v.magazines[loc].forEach((m,i)=>{m.visible=i<count;});
 }
}
