/** R870 P13: proportion-tuned, grip-first, reference-led Fieldwork Police-wood caricature.
 * This is the same shared Arsenal/operator/replay factory model, not a lab
 * proxy. Every polygon must earn its silhouette at mobile gameplay size.
 * +X muzzle, +Y up, +Z right/ejection side; geometry only, no combat changes.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {R870_P07} from './r870-art-contract.ts';
import {r870RearPair,R870_REAR_PARTS} from './r870-rear-p12.ts';
import {r870Barrel,r870Tube,r870Pump,r870FrontCompatible} from './r870-front-p14.ts';
import {addOutline,addCuboid,addFacetedTube,
 type SlotName,type Outline} from './profile-primitives.ts';
import {HK_BLACK_METAL,HK_DARK_POLYMER,HK_WOOD,R870_WALNUT_GROOVE,
 FAL_VENT_SHADOW,FAL_MUZZLE_METAL} from './weapon-visual-palette.ts';

export function addR870Family(root:THREE.Group,build:WeaponFamilyBuild):void{
 const rearKey=r870RearPair(build.parts.stock,build.parts.grip);
 if(build.family!=='r870'||!rearKey||
  build.parts.receiver!=='r870-police-receiver'||
  !r870FrontCompatible(build.parts.barrel,build.parts.magazine,build.parts.handguard))
  throw new Error('Unimplemented Remington 870 front/rear combination');
 const rear=R870_REAR_PARTS[rearKey];
 const frontBarrel=r870Barrel(build.parts.barrel)!;
 const frontTube=r870Tube(build.parts.magazine)!;
 const frontPump=r870Pump(build.parts.handguard)!;
 const seq:Record<SlotName,number>={
  stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0
 };
 const p=(slot:SlotName,outline:Outline,depth:number,material:THREE.Material)=>
  addOutline(root,slot,build.parts[slot],seq[slot]++,outline,depth,material);
 const b=(slot:SlotName,x:number,y:number,z:number,w:number,h:number,d:number,
  material:THREE.Material)=>
  addCuboid(root,slot,build.parts[slot],seq[slot]++,
   x,y,z,w,h,d,material);
 const t=(slot:SlotName,a:number,end:number,y:number,r:number,
  material:THREE.Material)=>{
  const mesh=addFacetedTube(root,slot,build.parts[slot],seq[slot]++,
   a,end,r,material);
  mesh.position.y=y;mesh.rotation.x=Math.PI/6;
  return mesh;
 };

 // The grip, not the rear butt, is the authored anatomical origin.
 // Stock extensions are independently selectable and only exist on shoulder
 // variants. Stockless variants have NO invisible/redundant picking mesh.
 // Grip widths, not side-view profiles, are the P13 change: wood is
 // leaner, stockless grips narrower, birdshead especially hand-sized.
 const gripDepth=rearKey==='birdshead'?2.38:rearKey==='pistol'?2.60:rearKey==='sga'?2.85:2.90;
 const rearWood=rearKey==='wood'||rearKey==='shortwood'||rearKey==='birdshead';
 const grip=p('grip',rear.gripOutline,gripDepth,
  rearWood?HK_WOOD:HK_DARK_POLYMER);
 grip.userData.r870RearGrip=rearKey;
 if(rear.stockOutline){
  const extension=p('stock',rear.stockOutline,rearKey==='sga'?3.04:2.90,
   rearWood?HK_WOOD:HK_DARK_POLYMER);
  extension.userData.r870StockExtension=true;
  const short=rearKey==='shortwood';
  // Thicker front-to-back pad; move its center forward to retain the
  // unchanged saved stockX (-15.78 or -13.78), and trim excess width.
  const sga=rearKey==='sga';
  const pad=b('stock',sga?-14.90:short?-13.44:-15.44,
   sga?-1.71:short?-1.79:-1.84,
   0,.68,sga?4.32:short?4.14:4.36,sga?3.18:3.12,HK_DARK_POLYMER);
  pad.userData.r870ButtPad=true;
 }
 if(rearKey==='mcs'){
  // One bold six-sided rail, one low-poly diagonal support and a wide
  // buttplate. The OPEN negative space defines this MCS-style skeleton;
  // no faux screws, rails or other microgeometry.
  const rail=t('stock',-13.94,-5.95,.49,.38,HK_BLACK_METAL);
  rail.userData.r870MCSSkeletal=true;
  const strut=p('stock',[
   [-13.84,-2.54],[-12.94,-2.30],[-5.95,-.99],
   [-5.95,-1.65],[-12.75,-2.95],[-13.84,-3.12]
  ],.84,HK_BLACK_METAL);
  strut.userData.r870MCSSkeletal=true;
  const pad=b('stock',-14.10,-1.18,0,.60,3.80,2.72,HK_DARK_POLYMER);
  pad.userData.r870MCSSkeletal=true;
 }
 root.userData.r870RearVariant=rearKey;
 root.userData.r870ShoulderStock=rear.hasShoulder;

 // RECEIVER: ONE strong exterior housing. This profile crown and steep
 // front nose do the visual work; no duplicated skins, frame tessellation,
 // secondary lower micro-line, bolt insert or ornamental edge chatter.
 const receiverOutline:Outline=[
  [-6.24,.84],[-5.48,1.52],[-3.78,1.75],
  [1.04,1.66],[2.84,.78],[2.84,-1.35],
  [1.83,-1.96],[-5.48,-1.96],[-6.24,-1.29]
 ];
 const receiver=p('receiver',receiverOutline,3.48,HK_BLACK_METAL);
 receiver.userData.r870BoldReceiver=true;
 // Large, UPWARD-SHIFTED flat shadow shape on the right (+Z). It is
 // deliberately a painted negative silhouette rather than an actual hole.
 // No bolt geometry, frame rim, z-fighting skins or real port recess.
 // The port is a graphic void, not a metal extrusion: a two-dimensional
 // four-triangle polygon, set just above the receiver's right side face.
 // Larger VERTICAL opening near the upper barrel/bolt axis. Six points,
 // still exactly four flat triangles and no machining-style inset.
 const portOutline:Outline=[
  [-1.36,.90],[-1.12,1.18],[1.58,1.18],
  [1.93,.85],[1.70,.10],[-1.36,.10]
 ];
 const shape=new THREE.Shape();
 shape.moveTo(portOutline[0][0],portOutline[0][1]);
 for(const [x,y] of portOutline.slice(1))shape.lineTo(x,y);
 shape.closePath();
 const port=new THREE.Mesh(new THREE.ShapeGeometry(shape,1),FAL_VENT_SHADOW);
 port.name='family-receiver-'+build.parts.receiver+'-'+seq.receiver++;
 port.position.z=1.785;
 port.castShadow=false;port.receiveShadow=false;root.add(port);
 port.userData.r870RightEjectionPort=true;
 port.userData.r870FlatPort=true;

 // FRONT: the two six-sided round forms are the silhouette, not thin rails.
 // Barrel and capped, non-detachable tube stay clearly separated. Retain
 // exact muzzle and stock datum for shot/pose/legacy-save compatibility.
 // Drop the visible steel axis 0.14 units without changing the authoritative
 // shot-time muzzle datum or the seated root at x=.60.
 const barrel=t('barrel',frontBarrel.barrelStartX,frontBarrel.muzzleX,R870_P07.muzzleY-.14,
  .96,HK_BLACK_METAL);
 barrel.userData.r870Barrel=true;
 const tube=t('magazine',3.02,frontTube.bodyEnd,-1.04,.80,HK_BLACK_METAL);
 tube.userData.r870FixedTube=true;
 const cap=t('magazine',frontTube.bodyEnd-.01,frontTube.capEnd,-1.04,.86,FAL_MUZZLE_METAL);
 cap.userData.r870TubeCap=true;
 // A deliberately OVER-SCALE post/bead at the actual muzzle. This is one
 // simple 6-face cuboid, not a tiny screw or complex rifle sight assembly.
 // Sight follows the lowered barrel and grows a restrained 7% so it
 // remains visible from a 1080p gameplay camera.
 const rifleSight=build.parts.barrel==='r870-20-rifle-sight';
 const bead=b('barrel',frontBarrel.muzzleX-.42,rifleSight?1.94:2.00,0,
  rifleSight?.62:.52,rifleSight?.78:.59,rifleSight?.70:.54,FAL_MUZZLE_METAL);
 bead.userData.r870FrontSight=true;
 if(rifleSight){
  // Two deliberately exaggerated but simple ramp/notch masses distinguish
  // the dedicated rifle-sighted barrel without adding a generic optic rail.
  const rear=b('barrel',-.04,2.09,0,.96,.84,1.08,HK_BLACK_METAL);
  rear.userData.r870RearRifleSight=true;
  root.userData.r870P16RifleSight=true;
 }
 if(build.parts.barrel==='r870-26-ventrib'){
  // The sporting family's readable signature is a LONG, raised rib
  // supported by three broad struts, not dozens of microscopic vents.
  const rib=b('barrel',14.97,1.95,0,23.06,.20,.42,HK_BLACK_METAL);
  rib.userData.r870VentilatedRib=true;
  for(const x of [7.15,14.45,21.75]){
   const post=b('barrel',x,1.72,0,.58,.34,.38,HK_BLACK_METAL);
   post.userData.r870VentRibSupport=true;
  }
  root.userData.r870P16Sport=true;
 }
 if(build.parts.magazine==='r870-extended-tube'){
  // A visible barrel/tube bridge makes the extended twin-cylinder front
  // instantly recognizable. One large faceted clamp, no screw geometry.
  const clamp=b('magazine',16.35,-.15,0,.64,1.90,1.38,HK_BLACK_METAL);
  clamp.userData.r870BarrelClamp=true;
 }

 // PUMP: constant six-vertex section for most of its length. Tiny 0.4-unit
 // end chamfers only. No P09 six-station inflatable "pillow" profile.
 // Thick faceted wood sleeve partially surrounds the fixed magazine tube.
 const mlok=frontPump.pattern==='mlok',sport=frontPump.pattern==='sport';
 const stations=[
  {x:frontPump.startX,top:sport?-.20:mlok?-.08:-.15,bottom:sport?-2.39:mlok?-2.45:-2.72,half:sport?1.43:mlok?1.53:1.70},
  {x:frontPump.startX+.43,top:sport?-.11:mlok?.06:-.04,bottom:sport?-2.55:mlok?-2.60:-2.84,half:sport?1.60:mlok?1.70:1.85},
  {x:frontPump.endX-.53,top:sport?-.11:mlok?.06:-.04,bottom:sport?-2.55:mlok?-2.60:-2.84,half:sport?1.60:mlok?1.70:1.85},
  {x:frontPump.endX,top:sport?-.20:mlok?-.08:-.15,bottom:sport?-2.39:mlok?-2.45:-2.72,half:sport?1.43:mlok?1.53:1.70}
 ] as const;
 const cross=(s:typeof stations[number]):[number,number,number][]=>
  [[s.x,s.top,0],[s.x,s.top-.68,s.half],
   [s.x,s.bottom+.68,s.half],[s.x,s.bottom,0],
   [s.x,s.bottom+.68,-s.half],[s.x,s.top-.68,-s.half]];
 const rings=stations.map(cross),coords:number[]=[];
 const tri=(a:number[],bb:number[],c:number[],cap=0)=>{
  const ax=bb[0]-a[0],ay=bb[1]-a[1],az=bb[2]-a[2];
  const bx=c[0]-a[0],by=c[1]-a[1],bz=c[2]-a[2];
  const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;
  const facing=cap?nx*cap:ny*((a[1]+bb[1]+c[1])/3+1.7)+
   nz*((a[2]+bb[2]+c[2])/3);
  if(facing>=0)coords.push(...a,...bb,...c);
  else coords.push(...a,...c,...bb);
 };
 for(let i=0;i<rings.length-1;i++)
  for(let j=0;j<6;j++){
   const k=(j+1)%6;
   tri(rings[i][j],rings[i+1][j],rings[i+1][k]);
   tri(rings[i][j],rings[i+1][k],rings[i][k]);
  }
 for(const [idx,side] of [[0,-1],[rings.length-1,1]] as const){
  const s=stations[idx],mid=[s.x,(s.top+s.bottom)/2,0];
  for(let j=0;j<6;j++)
   tri(mid,rings[idx][j],rings[idx][(j+1)%6],side);
 }
 // Non-indexed triangles yield actual FLAT facets with shared family wood,
 // not averaged normals that make the rigid sleeve appear inflatable.
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
 geometry.computeVertexNormals();
 const pump=new THREE.Mesh(geometry,frontPump.material==='wood'?HK_WOOD:HK_DARK_POLYMER);
 pump.name='family-handguard-'+build.parts.handguard+'-'+seq.handguard++;
 pump.castShadow=true;pump.receiveShadow=true;root.add(pump);
 pump.userData.r870PumpPart=true;
 pump.userData.r870CorncobStations=stations.length;
 pump.userData.r870PumpSides=6;
 if(mlok){
  // Two oversized ends are the SGA/M-LOK signature at gameplay scale,
  // much more readable than adding actual tiny mount-hole geometry.
  const rearStop=b('handguard',frontPump.startX+.30,-1.44,0,
   .40,2.74,3.64,HK_DARK_POLYMER);
  const frontStop=b('handguard',frontPump.endX-.33,-1.44,0,
   .42,2.74,3.64,HK_DARK_POLYMER);
  rearStop.userData.r870PumpPart=true;
  frontStop.userData.r870PumpPart=true;
 }
 // Eight flat graphic grooves are SIXTEEN triangles in ONE draw call.
 // P10 extruded each groove as a 12-triangle cuboid (96 triangles,
 // 8 draw calls) even though sidewall thickness is invisible at gameplay
 // scale. Flat side-facing quads keep the EXACT approved 4/side layout.
 const grooveVertices:number[]=[],grooveIndices:number[]=[];
 // A mini MCS fore-end has only three bold readable ribs. Five full
 // Police ribs would overlap on its deliberately abbreviated sleeve.
 const grooveCount=sport?0:frontPump.endX<8?3:frontPump.pattern==='mlok'?3:
  frontPump.material==='wood'?4:5;
 const innerWidth=frontPump.endX-frontPump.startX-2.8;
 for(let i=0;i<grooveCount;i++){
  const x=frontPump.startX+1.28+(i+.12)*(innerWidth/grooveCount);
  for(const side of [-1,1]){
   const z=side*1.925,base=grooveVertices.length/3;
   const horizontal=frontPump.pattern==='mlok';
   const w=horizontal?.92:.38;
   const top=horizontal?-.86:-.78;
   const bottom=horizontal?-1.15:-2.10;
   grooveVertices.push(
    x,top,z, x+w,top,z,
    x+w,bottom,z, x,bottom,z);
   if(side>0)grooveIndices.push(base,base+2,base+1,base,base+3,base+2);
   else grooveIndices.push(base,base+1,base+2,base,base+2,base+3);
  }
 }
 if(grooveCount>0){
 const grooveGeometry=new THREE.BufferGeometry();
 grooveGeometry.setAttribute('position',new THREE.Float32BufferAttribute(grooveVertices,3));
 grooveGeometry.setIndex(grooveIndices);
 grooveGeometry.computeVertexNormals();
 // Walnut shadow, not separate gray-looking polymer strips.
 const grooves=new THREE.Mesh(grooveGeometry,frontPump.material==='wood'?R870_WALNUT_GROOVE:FAL_VENT_SHADOW);
 grooves.name='family-handguard-'+build.parts.handguard+'-'+seq.handguard++;
 grooves.castShadow=false;grooves.receiveShadow=false;
 grooves.userData.r870PumpPart=true;
 grooves.userData.r870GrooveBatch=true;
 grooves.userData.r870GrooveCount=grooveCount*2;
 root.userData.r870FrontFamilyP14=true;
 root.add(grooves);
 }
 // Two meshes move as ONE fore-end assembly: faceted sleeve + batched
 // grooves. Part naming, pump identity and contact landmarks are unchanged.
 root.userData.r870P07=true;root.userData.r870P08=true;
 root.userData.r870P09=true;root.userData.r870P10=true;
 root.userData.r870P12=true;
 root.userData.r870P12Optimized=true;
 root.userData.r870P13=true;
 root.userData.r870PumpRearTravel=R870_P07.pumpRearTravel;
}
