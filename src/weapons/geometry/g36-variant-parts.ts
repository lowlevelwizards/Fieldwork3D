/** G36 family variants — ONLY the silhouettes that differ from the approved
 * original R6. All variants start with the original common receiver/grip/SEF,
 * then swap the physical modules and re-use the same pooled factory finishes.
 * No independent cloned rifle builder or per-frame geometry.
 */
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {addCuboid,addOutline} from './profile-primitives.ts';
import {addG36H3FactoryHandguard,G36_GUARD_FRONT_X,type G36GuardLength}
 from './g36-h3-handguard.ts';
import {buildG36OriginalBlockout} from './g36-silhouettes.ts';

export const G36_FRONT_END=Object.freeze({
 'g36-barrel-480':{muzzleX:19.50,barrelStartX:13.17,guard:'long',lengthScale:1},
 'g36-barrel-318':{muzzleX:15.50,barrelStartX:10.20,guard:'mid',lengthScale:.88},
 'g36-barrel-228':{muzzleX:12.15,barrelStartX:8.12,guard:'short',lengthScale:.78}
} as const);
export type G36BarrelId=keyof typeof G36_FRONT_END;
export function g36FrontEnd(id:string){return G36_FRONT_END[id as G36BarrelId];}
export function g36HandguardEnd(id:string):number{
 return id==='g36-handguard-c'?G36_GUARD_FRONT_X.short:
  id==='g36-handguard-k'||id==='g36-handguard-k-rail'?G36_GUARD_FRONT_X.mid:G36_GUARD_FRONT_X.long;
}
export function g36SupportRange(id:string):readonly [number,number]{
 const end=g36HandguardEnd(id);
 return [4.15+.65,Math.max(5.70,end-1.35)];
}
const dispose=(root:THREE.Group,predicate:(m:THREE.Mesh)=>boolean)=>{
 for(const obj of [...root.children]){
  if(!(obj instanceof THREE.Mesh)||!predicate(obj))continue;
  root.remove(obj);obj.geometry.dispose();
 }
};
function moveStockToShort(root:THREE.Group){
 // Scale only stock FRAME and pad around the existing hinge. Never affect
 // grip, sight, magazine, fore-end or rifle length datums.
 for(const obj of root.children){
  if(!(obj instanceof THREE.Mesh)||!(obj.userData.g36MasterStock||obj.userData.g36Buttpad))continue;
  const p=obj.geometry.getAttribute('position') as THREE.BufferAttribute;
  for(let i=0;i<p.count;i++)p.setX(i,-6.64+(p.getX(i)+6.64)*.87);
  p.needsUpdate=true;obj.geometry.computeBoundingBox();
 }
}
function addModernStock(root:THREE.Group,mat:THREE.Material){
 dispose(root,m=>Boolean(m.userData.g36MasterStock||m.userData.g36Buttpad));
 const stock=addOutline(root,'stock','g36-stock-adjustable',0,[
  [-6.57,.22],[-10.15,.42],[-12.30,.18],[-14.45,.02],
  [-14.45,-3.58],[-13.86,-4.03],[-12.05,-3.45],
  [-10.65,-2.01],[-6.57,-1.68]
 ],1.72,mat);
 stock.userData.g36AdjustableStock=true;
 const cheek=addCuboid(root,'stock','g36-stock-adjustable',1,
  -11.25,.33,0,4.70,.60,1.83,mat);
 cheek.userData.g36AdjustableCheek=true;
 const pad=addCuboid(root,'stock','g36-stock-adjustable',2,
  -14.66,-1.88,0,.44,3.89,1.50,mat);
 pad.userData.g36Buttpad=true;
}
export function g36ReceiverRailSpan(barrelId:string):readonly [number,number]{
 // The C's longer sight bridge follows its unique compact front; KA4 stays
 // on the previously approved original rail span. Used by real optic mounts.
 return [-5.855,barrelId==='g36-barrel-228'?7.695:6.295];
}
/** The low-rise C rail is not the chunky K A4 sight bridge.
 * Its base is flush with the receiver roof and its seven broad teeth are
 * batched into ONE geometry: side-view readability without extra draw calls.
 * The same top datum is consumed by physical optic-mount contact surfaces.
 */
export const G36_COMPACT_RAIL_TOP_Y=1.96;
function addCompactRailSight(root:THREE.Group,mat:THREE.Material,id:string){
 const [rear,front]=g36ReceiverRailSpan('g36-barrel-228');
 const sections:THREE.BufferGeometry[]=[];
 const base=new THREE.BoxGeometry(front-rear,.30,1.16);
 base.translate((rear+front)/2,1.67,0);sections.push(base);
 for(let i=0;i<7;i++){
  const tooth=new THREE.BoxGeometry(.72,.14,1.08);
  tooth.translate(rear+1.70+i*1.70,1.89,0);
  sections.push(tooth);
 }
 const geometry=mergeGeometries(sections);
 sections.forEach(part=>part.dispose());
 if(!geometry)throw Error('G36C low rail geometry could not be batched');
 const rail=new THREE.Mesh(geometry,mat);
 rail.name='family-receiver-'+id+'-100';
 rail.castShadow=true;rail.receiveShadow=true;
 rail.userData.g36PicatinnyTop=true;
 rail.userData.g36CompactLowRail=true;
 rail.userData.g36CompactRailTeeth=7;
 rail.userData.g36CompactRailTopY=G36_COMPACT_RAIL_TOP_Y;
 root.add(rail);
 // Integrated, folded-down silhouette: short tapered ears emerge from the
 // existing rail, instead of large separate cuboid towers.
 const contours:readonly (readonly (readonly [number,number])[])[]=[
  [[-5.25,1.80],[-5.23,2.00],[-5.05,2.19],
   [-4.87,2.19],[-4.65,1.98],[-4.65,1.80]],
  [[6.69,1.80],[6.83,2.00],[6.91,2.19],
   [7.09,2.19],[7.25,1.99],[7.31,1.80]]
 ];
 for(const [i,profile] of contours.entries()){
  const iron=addOutline(root,'receiver',id,101+i,profile,.82,mat);
  iron.userData.g36BackupIron=true;
  iron.userData.g36CompactIntegratedIron=true;
 }
}
function addRailSight(root:THREE.Group,mat:THREE.Material,id:string,
 barrelId:string){
 if(barrelId==='g36-barrel-228'){
  addCompactRailSight(root,mat,id);
  return;
 }
 // Previously approved K A4 remains byte-for-byte unchanged.
 const [rear,front]=g36ReceiverRailSpan(barrelId);
 const rail=addCuboid(root,'receiver',id,100,(rear+front)/2,1.96,0,
  front-rear,.53,1.35,mat);
 rail.userData.g36PicatinnyTop=true;
 for(const [i,x] of [-4.95,5.14].entries()){
  const iron=addCuboid(root,'receiver',id,101+i,x,2.39,0,.60,.55,1.0,mat);
  iron.userData.g36BackupIron=true;
 }
}
function addShortFront(root:THREE.Group,mat:THREE.Material,
 guardId:string,barrelId:G36BarrelId){
 const front=G36_FRONT_END[barrelId];
 const guardLength:G36GuardLength=guardId==='g36-handguard-c'?'short':
  guardId==='g36-handguard-k-rail'?'mid-rail':'mid';
 dispose(root,m=>Boolean(m.userData.g36LongHandguard));
 const shell=addG36H3FactoryHandguard(root,guardId,0,mat,guardLength);
 shell.userData.g36FamilyGuardId=guardId;
 if(guardLength==='mid-rail'){
  const rail=addCuboid(root,'handguard',guardId,1,
   7.64,1.48,0,6.30,.39,1.40,mat);
  rail.userData.g36ModernHandguardRail=true;
  const bottom=addCuboid(root,'handguard',guardId,2,
   7.64,-1.98,0,6.30,.34,1.42,mat);
  bottom.userData.g36ModernHandguardRail=true;
  for(const [index,sign] of [-1,1].entries()){
   const side=addCuboid(root,'handguard',guardId,3+index,
    7.75,-.20,sign*1.47,4.65,.35,.28,mat);
   side.userData.g36ModernHandguardRail=true;
  }
 }
 dispose(root,m=>Boolean(m.userData.g36Barrel||m.userData.g36FactoryMuzzle));
 const tip=front.muzzleX;
 const bodyStart=front.barrelStartX;
 const bodyEnd=tip-1.05;
 const tube=addCuboid(root,'barrel',barrelId,0,
  (bodyStart+bodyEnd)/2,0,0,bodyEnd-bodyStart,1.14,1.14,mat);
 tube.userData.g36Barrel=true;
 const left=tip-1.65,shoulder=tip-1.24,neck=tip-.99;
 const flash=addOutline(root,'barrel',barrelId,1,[
  [left,.60],[shoulder,.77],[neck,.64],[tip,.64],
  [tip,-.64],[neck,-.64],[shoulder,-.77],[left,-.60]
 ],1.42,mat);
 flash.userData.g36FactoryMuzzle=true;
 flash.userData.g36MuzzleStartX=left;
 flash.userData.g36MuzzleEndX=tip;
 flash.userData.g36MuzzleArtVersion='r3-faceted-flash-hider-short-family';
}
export function buildG36FamilyBlockout(material:THREE.Material,
 build:WeaponFamilyBuild):THREE.Group{
 const root=buildG36OriginalBlockout(material);
 const ids=build.parts,receiver=ids.receiver;
 if(ids.stock==='g36-stock-short')moveStockToShort(root);
 else if(ids.stock==='g36-stock-adjustable')addModernStock(root,material);
 if(receiver==='g36-rail-receiver'){
  dispose(root,m=>Boolean(m.userData.g36HandleOpening||
   m.userData.g36LowerOptic||m.userData.g36UpperReflex||
   m.userData.g36LowerOpticBarrel||m.userData.g36UpperReflexBarrel||
   m.userData.g36OpticFace||m.userData.g36UpperReflexWindow));
  addRailSight(root,material,receiver,ids.barrel);
 }else if(receiver==='g36-single-receiver'){
  dispose(root,m=>Boolean(m.userData.g36UpperReflex||
   m.userData.g36UpperReflexBarrel||m.userData.g36UpperReflexWindow));
 }
 if(ids.barrel!=='g36-barrel-480'){
  addShortFront(root,material,ids.handguard,ids.barrel as G36BarrelId);
 }else if(ids.handguard!=='g36-handguard-long'){
  throw Error('G36 480mm barrel requires long factory handguard');
 }
 // All six canonical slots own their genuine part identity in the mesh
 // naming. Existing factory master and all of its positional contracts
 // remain byte-for-byte unchanged when selected.
 const original={
  receiver:'g36-dual-receiver',stock:'g36-stock',
  handguard:'g36-handguard-long',barrel:'g36-barrel-480'
 } as const;
 for(const child of root.children){
  for(const slot of Object.keys(original) as (keyof typeof original)[]){
   const from='family-'+slot+'-'+original[slot]+'-';
   if(child.name.startsWith(from))
    child.name='family-'+slot+'-'+ids[slot]+'-'+child.name.slice(from.length);
  }
 }
 root.userData.g36Variant=ids.barrel;
 root.userData.g36TopAssembly=receiver==='g36-rail-receiver'?'flat-rail':
  receiver==='g36-single-receiver'?'single-optic':'dual-optic';
 root.userData.g36GuardEnd=g36HandguardEnd(ids.handguard);
 root.userData.g36MuzzleX=G36_FRONT_END[ids.barrel as G36BarrelId].muzzleX;
 return root;
}
