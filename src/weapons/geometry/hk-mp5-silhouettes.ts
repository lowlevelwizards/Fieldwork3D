/** MP5 miniature family; WC2 shared exterior sculptural language.
 * Shared receiver + 9mm feed, with three different silhouettes. Geometry is
 * created ONLY when the workbench/weapon configuration changes.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {addOutline,addCuboid,addFacetedTube,addProfileFrame,type Outline,type SlotName}
 from './profile-primitives.ts';
import {HK_BARREL_ART} from './hk-barrel-profiles.ts';
import {MP5_VISUAL_ANATOMY} from './weapon-receiver-anatomy.ts';
import {HK9_MAG_METAL,HK_WA9_SD_ACCENT,
 HK_MUZZLE_METAL} from './weapon-visual-palette.ts';
import {mp5MagazineOutline,mp5MagazineHeelOutline,MP5_MAG_DEPTH}
 from './hk-mp5-magazine-profiles.ts';
import {addMP5TropicalForearm,addMP5SDShroud,addMP5TriRail,
 addMP5SlimForearm}
 from './hk-mp5-handguard-profiles.ts';
import {addWeaponPixelMark} from './weapon-pixel-detail.ts';
import {addHKTriggerSelector} from './hk-trigger-selector.ts';

const MP5_RECEIVERS=['hk-mp5-standard','hk-mp5sd-integral',
 'hk-mp5k-stockless'] as const;
export function addHKMP5Family(root:THREE.Group,build:WeaponFamilyBuild,
 steel:THREE.Material,dark:THREE.Material,showFactoryMuzzle=true):void{
 const parts=build.parts;
 if(!MP5_RECEIVERS.includes(parts.receiver as typeof MP5_RECEIVERS[number]))
  throw new Error('Unknown MP5 receiver '+parts.receiver);
 const isSD=parts.receiver==='hk-mp5sd-integral';
 const isK=parts.receiver==='hk-mp5k-stockless';
 const art=HK_BARREL_ART[parts.barrel];
 if(!art||!['hk-mp5-standard-barrel','hk-mp5sd-integrated',
   'hk-mp5k-short'].includes(parts.barrel))
  throw new Error('Unknown MP5 barrel '+parts.barrel);
 const ids:Record<SlotName,number>={
  stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0
 };
 const p=(slot:SlotName,shape:Outline,depth:number,
  material:THREE.Material=steel)=>{
  return addOutline(root,slot,parts[slot],ids[slot]++,shape,depth,material);
 };
 const b=(slot:SlotName,x:number,y:number,z:number,
  width:number,height:number,depth:number,material:THREE.Material=steel)=>
   addCuboid(root,slot,parts[slot],ids[slot]++,x,y,z,
    width,height,depth,material);

 // Shared compact visual body: squared ends and a stronger central mass.
 // Keep the same planar mark surfaces and attachment/contact landmarks.
 p('receiver',[[-6.10,-1.52],[-6.10,1.29],[-5.63,1.75],
  [2.82,1.75],[3.35,1.33],[3.35,-1.54],
  [2.78,-1.89],[-5.37,-1.89]],3.05);
 p('receiver',[[-5.55,-1.33],[-5.16,-2.08],[-4.43,-2.31],
  [-3.17,-2.57],[-2.72,-2.39],[-.53,-2.40],
  [2.46,-2.43],[3.13,-1.44]],2.95,dark);
 p('receiver',[[.02,-1.98],[2.95,-1.98],
  [2.99,-2.76],[.06,-2.76]],2.98);
 // No modelled trigger guard: matches locked AR / AK / G3 convention.
 p('grip',[[-4.90,-2.31],[-2.50,-2.31],
  [-2.90,-5.88],[-3.12,-6.72],[-4.95,-6.66],
  [-5.06,-3.43]],2.16,dark);

 // Unique MP5 stock geometry, NOT a G3 stock scaled uniformly.
 if(isK){
  if(parts.stock==='hk-mp5k-pdw-stock'){
   // WC2.2 game-art candidate: one continuous carved frame, not two
   // stacked sticks. Preserve the original shoulder datum and marked pad.
   const pivot=b('stock',-6.33,-.24,-.40,1.03,3.20,3.30,steel);
   pivot.userData.hkMP5PDWHinge=true;
   const frame=addProfileFrame(root,'stock',parts.stock,ids.stock++,
    [[-12.72,1.02],[-6.32,.86],[-6.32,.05],[-8.02,-.30],
     [-12.70,-2.48],[-12.83,-2.20]],
    [[-11.92,.22],[-11.95,-1.16],[-8.81,.08]],
    2.12,dark);
   frame.userData.hkMP5PDWFrame=true;
   const butt=p('stock',[
    [-13.05,1.16],[-12.46,1.10],[-12.46,-2.34],
    [-12.76,-2.70],[-13.05,-2.57]
   ],3.20,dark);
   butt.userData.hkMP5PDWButt=true;
  }else{
   const cap=b('stock',-6.30,-.25,0,.70,3.18,3.22,dark);
   cap.userData.hkMP5StocklessCap=true;
  }
 }else if(parts.stock==='hk-mp5-fixed-stock'){
  // A2 and SD2 share the extended retractable stock's shoulder landmark.
  // One heavy solid polymer shell; no added screws, vents or buttstock rails.
  const rear=-13.05,start=rear+.43;
  const fixed=p('stock',[
   [start,1.07],[-10.95,1.38],[-9.65,1.15],
   [-6.08,.80],[-6.01,-1.35],[-8.44,-1.87],
   [-10.08,-2.77],[start,-2.68]
  ],3.18,dark);
  fixed.userData.hkMP5FixedStock=true;
  const pad=b('stock',rear+.27,-.80,0,.54,3.99,3.54,dark);
  pad.userData.hkMP5FixedButtpad=true;
 }else{
  const rear=-13.05;
  for(const z of [-1.10,1.10]){
   const rail=b('stock',(-12.53-5.90)/2,.34,z,
    -5.90+12.53,.78,.68,steel);
   rail.userData.hkMP5RetractRail=true;
  }
  const plate=p('stock',[
   [rear,1.18],[rear+1.04,1.12],[rear+.91,-.52],
   [rear+1.30,-1.51],[rear+.83,-2.39],[rear+.30,-2.71],
   [rear,-2.45]
  ],3.34,dark);
  plate.userData.hkMP5RetractButt=true;
  const junction=b('stock',-6.09,.34,0,.82,1.0,2.95,steel);
  junction.userData.hkMP5RailJunction=true;
 }
 // Smooth, thin, graceful 9mm curved-ribbon mag. NO AK stamped ribs.
 if(parts.magazine!=='hk9-mag30')
  throw new Error('MP5 magazine must use the HK9 feed');
 const mag=p('magazine',mp5MagazineOutline(),MP5_MAG_DEPTH,HK9_MAG_METAL);
 mag.userData.hkMP5SmoothMagazine=true;
 const heel=p('magazine',mp5MagazineHeelOutline(),
  MP5_MAG_DEPTH+.07,dark);
 heel.userData.hkMP5MagazineHeel=true;

 if(isSD){
  // Massive cylindrical fore-end; coarse symbolic bands only.
  addMP5SDShroud(root,parts.handguard,ids.handguard++,
   art.handguardStartX,art.handguardEndX,dark);
 }else if(parts.handguard==='hk-mp5-trirail'){
  addMP5TriRail(root,parts.handguard,ids.handguard++,
   art.handguardStartX,art.handguardEndX,dark);
 }else if(parts.handguard==='hk-mp5-slim'){
  addMP5SlimForearm(root,parts.handguard,ids.handguard++,
   art.handguardStartX,art.handguardEndX,dark);
 }else{
  addMP5TropicalForearm(root,parts.handguard,ids.handguard++,
   art.handguardStartX,art.handguardEndX,isK,dark);
 }
 // One thick shoulder joining the polymer to the stamped receiver.
 b('handguard',3.24,-.17,0,.42,2.52,2.81,steel);
 if(isK){
  // The K's huge INTEGRAL vertical foregrip, not a generic attachment.
  // Broad forward-raked silhouette, firmly seated under the tiny fore-end.
  // Deliberately oversize height/width/depth instead of adding grip grooves.
  const vertical=p('handguard',[
   [3.54,-1.19],[4.78,-1.19],[4.94,-2.52],
   [5.14,-5.51],[4.85,-5.92],[3.83,-5.92],
   [3.61,-5.50],[3.61,-2.44]
  ],2.20,dark);
  vertical.userData.hkMP5KVerticalForegrip=true;
 }
 // Short cocking tube still exists on the K; never scale the lever away.
 const cockingEnd=isK?4.93:isSD?9.40:9.65;
 const tube=addFacetedTube(root,'receiver',parts.receiver,ids.receiver++,
  3.02,cockingEnd,.51,steel);
 tube.position.y=1.48;
 const handle=p('receiver',[
  [3.56,1.40],[4.95,1.40],[4.95,1.89],
  [4.55,1.89],[4.48,2.38],[3.84,2.38],[3.56,2.12]
 ],1.70,steel);
 handle.position.z=-1.03;
 handle.userData.hkCockingHandle=true;

 if(isSD){
  // An integral suppressor is ALWAYS factory geometry, not an attachment.
  // Start behind the handguard rim and end precisely at the art muzzle.
  const length=art.muzzleX-9.48;
  const geometry=new THREE.CylinderGeometry(1.15,1.15,length,8,1);
  geometry.rotateZ(-Math.PI/2);
  const suppressor=new THREE.Mesh(geometry,HK_WA9_SD_ACCENT);
  suppressor.position.x=(art.muzzleX+9.48)/2;
  suppressor.name='family-barrel-'+parts.barrel+'-'+ids.barrel++;
  suppressor.castShadow=true;suppressor.receiveShadow=true;
  suppressor.userData.hkMP5IntegralSuppressor=true;
  root.add(suppressor);
 }else{
  const hiderStart=art.muzzleX-(isK?.58:.82);
  const barrelEnd=showFactoryMuzzle?hiderStart+.12:art.muzzleX;
  const length=barrelEnd-art.barrelStartX;
  const geometry=new THREE.CylinderGeometry(isK?.64:.65,
   isK?.64:.65,length,6,1);
  geometry.rotateZ(-Math.PI/2);
  const barrel=new THREE.Mesh(geometry,steel);
  barrel.position.x=(art.barrelStartX+barrelEnd)/2;
  barrel.castShadow=true;barrel.receiveShadow=true;
  barrel.name='family-barrel-'+parts.barrel+'-'+ids.barrel++;
  root.add(barrel);
  if(showFactoryMuzzle){
   const device=p('barrel',[
    [hiderStart,-.76],[art.muzzleX-.14,-.76],
    [art.muzzleX,-.61],[art.muzzleX,.61],
    [art.muzzleX-.14,.76],[hiderStart,.76]
   ],1.72,HK_MUZZLE_METAL);
   device.userData.hkFactoryFlashHider=true;
  }
 }
 // One oversized hooded front post shared with the locked HK language.
 p('barrel',[
  [art.frontSightX-.45,.10],[art.frontSightX-.31,1.22],
  [art.frontSightX-.17,1.38],[art.frontSightX+.19,1.38],
  [art.frontSightX+.40,.10]
 ],1.58,steel);
 const hoodGeo=new THREE.TorusGeometry(.80,.29,4,6);
 hoodGeo.rotateY(Math.PI/2);
 const hood=new THREE.Mesh(hoodGeo,steel);
 hood.position.set(art.frontSightX,2.23,0);
 hood.name='family-barrel-'+parts.barrel+'-'+ids.barrel++;
 hood.castShadow=true;hood.receiveShadow=true;root.add(hood);
 hood.userData.hkMP5FrontHood=true;

 const a=MP5_VISUAL_ANATOMY;
 const port=addWeaponPixelMark(root,'hk-port',a.portX,a.portY,
  1.532,a.portWidthX,a.portHeightY);
 port.userData.hkEjectionPort=true;
 addHKTriggerSelector(root,'pictogram',1.545,1.475);
 const sightGeo=new THREE.CylinderGeometry(1.12,1.12,1.40,6);
 const sight=new THREE.Mesh(sightGeo,steel);
 sight.position.set(-3.55,2.43,0);
 sight.name='family-receiver-'+parts.receiver+'-'+ids.receiver++;
 sight.castShadow=true;sight.receiveShadow=true;root.add(sight);
 sight.userData.hkRearSight='diopter-drum';
}
