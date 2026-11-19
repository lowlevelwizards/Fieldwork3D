/** R870 P09: reference-led iconic forms, preserving the P08 platform contracts., intentionally caricatured 18-inch Police-style 870.
 * This is the real Arsenal/rig/replay geometry builder, NOT a second lab mesh.
 * Six UI slots own distinct geometry while stock + wrist read as one solid
 * wood form; the tube is a FIXED feed exterior, not a detachable magazine.
 * +X forward, +Y up, +Z operator's right. Art only; no ballistics here.
 */
import * as THREE from 'three';
import {R870_P07} from './r870-art-contract.ts';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {addOutline,addCuboid,addFacetedTube,addProfileFrame,
 type SlotName,type Outline}
 from './profile-primitives.ts';
import {HK_BLACK_METAL,HK_DARK_POLYMER,HK_WOOD,FAL_VENT_SHADOW,
 FAL_MUZZLE_METAL,FAL_TRANSITION_METAL} from './weapon-visual-palette.ts';

const PARTS=Object.freeze({
 receiver:'r870-police-receiver',
 stock:'r870-police-wood-stock',
 grip:'r870-police-wood-wrist',
 magazine:'r870-standard-tube',
 handguard:'r870-police-wood-pump',
 barrel:'r870-18-bead'
});
export function addR870Family(root:THREE.Group,build:WeaponFamilyBuild):void{
 if(build.family!=='r870'||Object.entries(PARTS).some(([slot,id])=>
   build.parts[slot as SlotName]!==id))
  throw new Error('Unimplemented Remington 870 appearance configuration');
 const seq:Record<SlotName,number>={
  stock:0,receiver:0,grip:0,magazine:0,handguard:0,barrel:0
 };
 const p=(slot:SlotName,outline:Outline,depth:number,material:THREE.Material)=>{
  return addOutline(root,slot,build.parts[slot],seq[slot]++,
   outline,depth,material);
 };
 const b=(slot:SlotName,x:number,y:number,z:number,w:number,h:number,d:number,
  mat:THREE.Material)=>addCuboid(root,slot,build.parts[slot],seq[slot]++,
   x,y,z,w,h,d,mat);
 const t=(slot:SlotName,a:number,end:number,y:number,r:number,mat:THREE.Material)=>{
  const mesh=addFacetedTube(root,slot,build.parts[slot],seq[slot]++,
   a,end,r,mat);
  mesh.position.y=y;return mesh;
 };
 // Wood shoulder, flared butt heel, flowing comb and shallow rounded wrist:
 // two touching solids with a SHARED JOIN, not a detached rifle pistol grip.
 // The new bottom sweep avoids the old P04/P05 protruding hook.
 const joinTop:[number,number]=[-9.50,.77];
 const joinBottom:[number,number]=[-9.42,-2.65];
 p('stock',[
  [-15.45,1.10],[-13.85,1.24],[-12.45,1.10],[-11.05,.92],
  joinTop,joinBottom,[-10.48,-2.66],[-11.90,-3.37],
  [-13.25,-3.76],[-15.45,-3.76]
 ],3.22,HK_WOOD);
 b('stock',-15.61,-1.33,0,.34,4.86,3.40,HK_DARK_POLYMER);
 p('grip',[
  joinTop,[-8.20,.67],[-6.10,.82],[-6.10,-1.85],
  [-6.65,-1.94],[-7.06,-2.46],[-7.46,-2.94],
  [-8.05,-3.26],[-8.61,-3.16],[-9.08,-2.83],joinBottom
 ],3.22,HK_WOOD);
 // Reference profile: elongated upper crown, rounded rear shoulder, tapered
 // forward nose and substantial lower body; not a straight-sided cuboid.
 // Keep the 870 distinct from the later angular Mossberg 500 visual family.
 const receiverOutline:Outline=[
  [-6.22,1.15],[-5.77,1.54],[-5.07,1.70],[-2.85,1.78],
  [.45,1.77],[2.02,1.62],[2.82,1.16],[2.88,.65],
  [2.88,-1.35],[2.18,-1.85],[-5.55,-1.85],[-6.22,-1.31]
 ];
 // The core is shallower than the outer side skins. This permits an ACTUAL
 // open profile in the +Z receiver face with the bolt recessed behind it.
 p('receiver',receiverOutline,3.10,HK_BLACK_METAL);
 const leftSkin=p('receiver',receiverOutline,.18,HK_BLACK_METAL);
 leftSkin.position.z=-1.67;
 leftSkin.userData.r870SolidLeftReceiver=true;
 p('receiver',[
  [-5.20,-1.86],[2.03,-1.86],[1.64,-2.10],[-4.91,-2.10]
 ],3.10,HK_DARK_POLYMER);
 // Opposite winding from receiverOutline, with broadly chamfered corners.
 // This large horizontal opening is a true HOLE in the right-side steel skin,
 // never a black decal lying over a fully solid receiver face.
 const opening:Outline=[
  [-1.19,.73],[-1.33,.54],[-1.33,-.25],[-1.12,-.44],
  [1.57,-.44],[1.90,-.19],[1.90,.47],[1.69,.73]
 ];
 const rightSkin=addProfileFrame(root,'receiver',build.parts.receiver,
  seq.receiver++,receiverOutline,opening,.18,HK_BLACK_METAL);
 rightSkin.position.z=1.67;
 rightSkin.castShadow=true;rightSkin.receiveShadow=true;
 rightSkin.userData.r870RightPortFrame=true;
 // Behind the open skin: dark void and restrained steel bolt, both recessed.
 const port=p('receiver',[
  [-1.23,.66],[-1.23,-.37],[1.78,-.37],[1.78,.66]
 ],.018,FAL_VENT_SHADOW);
 port.position.z=1.56;
 port.userData.r870RightEjectionPort=true;
 const bolt=p('receiver',[
  [-.94,.43],[1.42,.43],[1.35,-.11],[-.94,-.11]
 ],.028,FAL_TRANSITION_METAL);
 bolt.position.z=1.59;
 bolt.userData.r870InsetBolt=true;
 // 870 geometry: a substantially heavier 6-sided plain barrel ABOVE a
 // separate chunky FIXED magazine tube.  Do not add a generic AR muzzle.
 const barrel=t('barrel',2.53,R870_P07.muzzleX,R870_P07.muzzleY,.80,HK_BLACK_METAL);
 barrel.rotation.x=Math.PI/6;
 barrel.userData.r870Barrel=true;
 const tubeBody=t('magazine',3.02,13.91,-.84,.68,HK_BLACK_METAL);
 tubeBody.rotation.x=Math.PI/6;
 tubeBody.userData.r870FixedTube=true;
 // A genuinely round/faceted screw-cap silhouette, not a hanging square nub.
 const cap=t('magazine',13.90,14.43,-.84,.76,FAL_MUZZLE_METAL);
 cap.rotation.x=Math.PI/6;
 cap.userData.r870TubeCap=true;
 // Plain bead is intentionally only a tiny second-order identity cue.
 b('barrel',18.77,1.87,0,.30,.28,.35,FAL_MUZZLE_METAL);
 // Short, paired action-bar hints link the receiver to the moving fore-end;
 // static silhouettes only at this milestone, not simulated mechanism motion.
 // Keep them dark, partly masked by the rear pump shoulder.
 for(const side of [-1,1]){
  const actionBar=p('receiver',[
   [2.25,-1.32],[4.12,-1.32],[4.12,-1.52],[2.25,-1.52]
  ],.12,HK_DARK_POLYMER);
  actionBar.position.z=side*1.43;
  actionBar.userData.r870ActionBar=true;
 }
 // A true low-poly corncob, with flared shoulders and a wider center rather
 // than a constant-depth box. Six longitudinal stations / eight-sided rings
 // produce broad, flat faceted surfaces and very few triangles.
 const stations=[
  {x:2.65,top:.06,bottom:-2.44,half:1.39},
  {x:3.76,top:.49,bottom:-2.88,half:1.76},
  {x:6.10,top:.72,bottom:-3.04,half:1.97},
  {x:8.63,top:.68,bottom:-3.04,half:1.91},
  {x:10.54,top:.49,bottom:-2.92,half:1.75},
  {x:11.50,top:.03,bottom:-2.53,half:1.40}
 ] as const;
 const cross=(s:typeof stations[number]):[number,number,number][]=>
  [[s.x,s.top,s.half*.68],[s.x,s.top-.50,s.half],
   [s.x,s.bottom+.47,s.half],[s.x,s.bottom,s.half*.67],
   [s.x,s.bottom,-s.half*.67],[s.x,s.bottom+.47,-s.half],
   [s.x,s.top-.50,-s.half],[s.x,s.top,-s.half*.68]];
 const rings=stations.map(cross),triangles:number[]=[];
 const triangle=(a:number[],bb:number[],c:number[],radial=true,cap=0)=>{
  const ay=bb[1]-a[1],az=bb[2]-a[2],ax=bb[0]-a[0];
  const by=c[1]-a[1],bz=c[2]-a[2],bx=c[0]-a[0];
  const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;
  const direction=radial?ny*((a[1]+bb[1]+c[1])/3+1.18)+
    nz*((a[2]+bb[2]+c[2])/3):nx*cap;
  if(direction>=0)triangles.push(...a,...bb,...c);
  else triangles.push(...a,...c,...bb);
 };
 for(let i=0;i<rings.length-1;i++)
  for(let j=0;j<8;j++){
   const k=(j+1)%8,a=rings[i][j],bb=rings[i+1][j],
    c=rings[i+1][k],d=rings[i][k];
   triangle(a,bb,c);triangle(a,c,d);
  }
 for(const [index,side] of [[0,-1],[rings.length-1,1]] as const){
  const ring=rings[index],station=stations[index];
  const center=[station.x,(station.top+station.bottom)/2,0];
  for(let j=0;j<8;j++)triangle(center,ring[j],ring[(j+1)%8],false,side);
 }
 const pumpGeo=new THREE.BufferGeometry();
 pumpGeo.setAttribute('position',new THREE.Float32BufferAttribute(triangles,3));
 pumpGeo.computeVertexNormals();
 const pump=new THREE.Mesh(pumpGeo,HK_WOOD);
 pump.name='family-handguard-'+build.parts.handguard+'-'+seq.handguard++;
 pump.castShadow=true;pump.receiveShadow=true;root.add(pump);
 pump.userData.r870PumpPart=true;
 pump.userData.r870CorncobStations=stations.length;
 // Four broad, dark, oversized corncob channels on both sides. The strips
 // follow local width/height changes rather than floating at a fixed depth.
 const interpolate=(x:number)=>{
  for(let i=0;i<stations.length-1;i++){
   const a=stations[i],bb=stations[i+1];
   if(x>bb.x)continue;
   const tval=(x-a.x)/(bb.x-a.x);
   return {top:a.top+(bb.top-a.top)*tval,
    bottom:a.bottom+(bb.bottom-a.bottom)*tval,
    half:a.half+(bb.half-a.half)*tval};
  }
  return stations[stations.length-1];
 };
 for(let i=0;i<4;i++){
  const x=4.32+i*1.73,station=interpolate(x+.15);
  for(const side of [-1,1]){
   const rib=p('handguard',[
    [x,station.top-.62],[x+.30,station.top-.62],
    [x+.28,station.bottom+.63],[x+.03,station.bottom+.63]
   ],.078,HK_DARK_POLYMER);
   rib.position.z=side*(station.half+.017);
   rib.userData.r870PumpPart=true;
  }
 }
 // Explicit identity for a future deterministic action animation. The
 // first Arsenal milestone is a STATIC preview; don't pretend to pump in
 // live combat without support-hand / simulation synchronization.
 root.userData.r870P07=true;
 root.userData.r870P08=true;
 root.userData.r870P09=true;
 root.userData.r870PumpRearTravel=R870_P07.pumpRearTravel;
}
