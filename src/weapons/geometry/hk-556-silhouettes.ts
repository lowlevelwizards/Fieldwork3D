/** HK33/HK53 shared exterior miniature language; purely visual, no action mechanics.
 * No uniform model scaling: the compact rifle keeps its full-sized receiver.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {addOutline,addCuboid,addFacetedTube,type Outline,type SlotName}
 from './profile-primitives.ts';
import {HK_BARREL_ART} from './hk-barrel-profiles.ts';
import {HK556_VISUAL_ANATOMY} from './weapon-receiver-anatomy.ts';
import {HK_OLIVE_POLYMER,HK_MAG_METAL,HK556_MAG_METAL,HK556_MAG_RIB}
 from './weapon-visual-palette.ts';
import {hk556MagazineOutline,hk556MagazineRibOutlines,
 hk556MagazineHeelOutline,type HK556MagazineId,HK556_MAG_LENGTHS}
 from './hk-556-magazine-profiles.ts';
import {addHK556Forearm} from './hk-556-handguard-profiles.ts';
import {addHKRetractableStock} from './hk-retractable-stock.ts';
import {addWeaponPixelMark} from './weapon-pixel-detail.ts';

export function addHK556Family(root:THREE.Group,build:WeaponFamilyBuild,
 steel:THREE.Material,dark:THREE.Material,showFactoryMuzzle=true):void{
 const parts=build.parts,compact=parts.receiver==='hk53-556-compact';
 const art=HK_BARREL_ART[parts.barrel];
 if(!art||!['hk33-service','hk53-short'].includes(parts.barrel))
  throw new Error('Unsupported HK 5.56 barrel '+parts.barrel);
 const ids:Record<SlotName,number>={
  stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0
 };
 const p=(slot:SlotName,shape:Outline,depth:number,
  material:THREE.Material=steel)=>{
  return addOutline(root,slot,parts[slot],ids[slot]++,shape,depth,material);
 };
 const b=(slot:SlotName,x:number,y:number,z:number,
  w:number,h:number,d:number,material:THREE.Material=steel)=>
   addCuboid(root,slot,parts[slot],ids[slot]++,x,y,z,w,h,d,material);
 // A single leaner 5.56mm stamped receiver. Keep top edge long and flat.
 p('receiver',[[-6.20,-1.38],[-6.20,1.04],[-5.51,1.80],
  [3.49,1.80],[4.45,1.16],[4.45,-1.35],[3.57,-1.70],
  [-5.40,-1.70]],3.28);
 // One subordinate trigger housing, without a separately modeled guard.
 p('receiver',[[-5.61,-1.32],[-5.18,-2.11],[-4.40,-2.36],
  [-3.17,-2.58],[-2.72,-2.37],[-.62,-2.35],
  [2.64,-2.49],[3.88,-1.48]],3.08,dark);
 p('receiver',[[-.42,-2.02],[2.82,-2.02],[2.97,-2.95],
  [-.19,-2.95]],3.13);

 if(compact){
  addHKRetractableStock(root,parts.stock,-14.90,steel,dark);
 }else{
  const rear=-13.88,start=rear+.44;
  p('stock',[[start,1.16],[-10.94,1.12],[-6.12,.75],
   [-6.12,-1.42],[-9.10,-2.25],[-13.36,-2.95],
   [start,-2.75]],2.96,HK_OLIVE_POLYMER);
  const pad=b('stock',rear+.27,-.78,0,.54,4.26,3.34,dark);
  pad.userData.hkButtpad=true;
 }

 // Exact G3 grip gesture, not a shrunken pistol grip.
 p('grip',[[-4.90,-2.31],[-2.50,-2.31],[-2.90,-5.88],
  [-3.12,-6.72],[-4.95,-6.66],[-5.06,-3.43]],2.16,dark);
 const magId=parts.magazine as HK556MagazineId;
 if(!(magId in HK556_MAG_LENGTHS))
  throw new Error('Invalid HK 5.56 magazine: '+magId);
 // AK-family normal-offset curved ribbon; the HK 5.56 silhouette stays
 // shallower and slimmer than an AK-74 and keeps its own feed geometry.
 const magShape=hk556MagazineOutline(magId);
 const mag=p('magazine',magShape,1.90,HK556_MAG_METAL);
 mag.userData.hk556RibbonBody=true;
 // Exactly two broad, low-contrast curved stamp impressions. One mesh each,
 // .08 depth above the body surfaces: no coplanar z-fighting.
 for(const shape of hk556MagazineRibOutlines(magId)){
  const rib=p('magazine',shape,1.98,HK556_MAG_RIB);
  rib.userData.hk556StampedRib=true;
  rib.castShadow=false;rib.receiveShadow=false;
 }
 // Follow the tilted bottom of the actual ribbon, not an old horizontal box.
 const heel=p('magazine',hk556MagazineHeelOutline(magId),1.98,dark);
 heel.userData.hk556Heel=true;

 // HK33 slim tube versus HK53 stubby handguard, NEVER an AR-style quad rail.
 addHK556Forearm(root,parts.handguard,ids.handguard++,
  art.handguardStartX,art.handguardEndX,compact,HK_OLIVE_POLYMER);
 b('handguard',4.21,-.18,0,.34,2.58,compact?2.98:2.76,steel);
 const tube=addFacetedTube(root,'receiver',parts.receiver,ids.receiver++,
  3.47,art.handguardEndX+.06,.54,steel);
 tube.position.y=1.56;
 // Single very legible left-side folding cocking lever.
 const handle=p('receiver',[[3.76,1.46],[5.36,1.46],
  [5.36,1.96],[4.81,1.96],[4.72,2.52],
  [4.03,2.52],[3.76,2.22]],1.76,steel);
 handle.position.z=-1.10;
 handle.userData.hkCockingHandle=true;

 // All three HK rifles use the identical economical barrel/hood construction.
 const flashStart=art.muzzleX-1.24;
 const barrelEnd=showFactoryMuzzle?flashStart+.14:art.muzzleX;
 const barrelGeo=new THREE.CylinderGeometry(.67,.67,
  barrelEnd-art.barrelStartX,6,1);
 barrelGeo.rotateZ(-Math.PI/2);
 const barrel=new THREE.Mesh(barrelGeo,steel);
 barrel.position.x=(art.barrelStartX+barrelEnd)/2;
 barrel.name='family-barrel-'+parts.barrel+'-'+ids.barrel++;
 barrel.castShadow=true;barrel.receiveShadow=true;root.add(barrel);
 if(showFactoryMuzzle){
  const hider=p('barrel',[[flashStart,-.76],[flashStart+.16,-.79],
   [art.muzzleX-.24,-.79],[art.muzzleX,-.62],
   [art.muzzleX,.62],[art.muzzleX-.24,.79],
   [flashStart+.16,.79],[flashStart,.76]],1.84,dark);
  hider.userData.hkFactoryFlashHider=true;
 }
 p('barrel',[[art.frontSightX-.49,.12],
  [art.frontSightX-.35,1.27],[art.frontSightX-.19,1.41],
  [art.frontSightX+.23,1.41],[art.frontSightX+.45,.12]],1.60,steel);
 const hoodGeom=new THREE.TorusGeometry(.83,.30,4,6);
 hoodGeom.rotateY(Math.PI/2);
 const hood=new THREE.Mesh(hoodGeom,steel);
 hood.position.set(art.frontSightX,2.25,0);
 hood.name='family-barrel-'+parts.barrel+'-'+ids.barrel++;
 hood.castShadow=true;hood.receiveShadow=true;root.add(hood);

 const a=HK556_VISUAL_ANATOMY;
 const port=addWeaponPixelMark(root,'hk-port',a.portX,a.portY,
  1.65,a.portWidthX,a.portHeightY);
 port.userData.hkEjectionPort=true;
 const selector=addWeaponPixelMark(root,'hk-selector',-3.48,-.67,
  -1.657,2.05,.60);
 selector.rotation.y=Math.PI;
 // One broad six-sided turret. Compact variant has SAME absolute sight size.
 const drum=new THREE.CylinderGeometry(1.13,1.13,1.46,6);
 const rear=new THREE.Mesh(drum,steel);
 rear.position.set(-3.53,2.50,0);
 rear.name='family-receiver-'+parts.receiver+'-'+ids.receiver++;
 rear.castShadow=true;rear.receiveShadow=true;root.add(rear);
 rear.userData.hkRearSight='diopter-drum';
}
