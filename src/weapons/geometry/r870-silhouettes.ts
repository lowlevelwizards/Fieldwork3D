/** R870 P10: bold, reference-led Fieldwork Police-wood caricature.
 * This is the same shared Arsenal/operator/replay factory model, not a lab
 * proxy. Every polygon must earn its silhouette at mobile gameplay size.
 * +X muzzle, +Y up, +Z right/ejection side; geometry only, no combat changes.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {R870_P07} from './r870-art-contract.ts';
import {addOutline,addCuboid,addFacetedTube,
 type SlotName,type Outline} from './profile-primitives.ts';
import {HK_BLACK_METAL,HK_DARK_POLYMER,HK_WOOD,
 FAL_VENT_SHADOW,FAL_MUZZLE_METAL} from './weapon-visual-palette.ts';

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

 // STOCK: two low-vertex adjoining wood silhouettes with one matching seam.
 // The lower wrist goes DOWN directly behind the receiver, then moves BACK
 // and slightly farther DOWN before returning into the full stock belly.
 // Flat calm comb, few big planes, broad butt; no decorative step-lining.
 const wristTop:[number,number]=[-9.35,.55];
 const wristHeel:[number,number]=[-9.35,-2.67];
 p('stock',[
  [-15.26,1.06],[-12.95,1.11],[-10.48,.76],wristTop,
  wristHeel,[-10.48,-2.73],[-12.40,-3.72],[-15.26,-3.72]
 ],3.22,HK_WOOD);
 const pad=b('stock',-15.51,-1.33,0,.54,4.83,3.52,HK_DARK_POLYMER);
 pad.userData.r870ButtPad=true;
 p('grip',[
  wristTop,[-7.98,.66],[-6.12,.78],[-6.12,-1.83],
  [-6.66,-1.94],[-7.07,-3.10],[-7.78,-3.60],
  [-8.43,-3.72],[-9.06,-3.44],wristHeel
 ],3.22,HK_WOOD);

 // RECEIVER: ONE strong exterior housing. This profile crown and steep
 // front nose do the visual work; no duplicated skins, frame tessellation,
 // secondary lower micro-line, bolt insert or ornamental edge chatter.
 const receiverOutline:Outline=[
  [-6.24,.84],[-5.48,1.52],[-3.78,1.80],
  [1.04,1.70],[2.84,.78],[2.84,-1.35],
  [1.83,-1.96],[-5.48,-1.96],[-6.24,-1.29]
 ];
 const receiver=p('receiver',receiverOutline,3.48,HK_BLACK_METAL);
 receiver.userData.r870BoldReceiver=true;
 // Large, UPWARD-SHIFTED flat shadow shape on the right (+Z). It is
 // deliberately a painted negative silhouette rather than an actual hole.
 // No bolt geometry, frame rim, z-fighting skins or real port recess.
 const port=p('receiver',[
  [-1.36,.82],[-1.12,1.06],[1.58,1.06],
  [1.93,.78],[1.70,.26],[-1.36,.26]
 ],.055,FAL_VENT_SHADOW);
 port.position.z=1.77;port.userData.r870RightEjectionPort=true;
 port.userData.r870FlatPort=true;

 // FRONT: the two six-sided round forms are the silhouette, not thin rails.
 // Barrel and capped, non-detachable tube stay clearly separated. Retain
 // exact muzzle and stock datum for shot/pose/legacy-save compatibility.
 const barrel=t('barrel',2.53,R870_P07.muzzleX,R870_P07.muzzleY,
  .96,HK_BLACK_METAL);
 barrel.userData.r870Barrel=true;
 const tube=t('magazine',3.02,13.91,-1.04,.80,HK_BLACK_METAL);
 tube.userData.r870FixedTube=true;
 const cap=t('magazine',13.90,14.43,-1.04,.86,FAL_MUZZLE_METAL);
 cap.userData.r870TubeCap=true;
 // A deliberately OVER-SCALE post/bead at the actual muzzle. This is one
 // simple 6-face cuboid, not a tiny screw or complex rifle sight assembly.
 const bead=b('barrel',18.78,2.13,0,.50,.55,.52,FAL_MUZZLE_METAL);
 bead.userData.r870FrontSight=true;

 // PUMP: constant six-vertex section for most of its length. Tiny 0.4-unit
 // end chamfers only. No P09 six-station inflatable "pillow" profile.
 // Thick faceted wood sleeve partially surrounds the fixed magazine tube.
 const stations=[
  {x:2.65,top:-.32,bottom:-3.10,half:1.86},
  {x:3.08,top:-.21,bottom:-3.23,half:2.03},
  {x:10.97,top:-.21,bottom:-3.23,half:2.03},
  {x:11.50,top:-.32,bottom:-3.10,half:1.86}
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
 const pump=new THREE.Mesh(geometry,HK_WOOD);
 pump.name='family-handguard-'+build.parts.handguard+'-'+seq.handguard++;
 pump.castShadow=true;pump.receiveShadow=true;root.add(pump);
 pump.userData.r870PumpPart=true;
 pump.userData.r870CorncobStations=stations.length;
 pump.userData.r870PumpSides=6;
 // Four clear vertical dark channels per side. No tiny fasteners or
 // dynamic position sampling: both long side flats are straight.
 for(let i=0;i<4;i++){
  const x=4.29+i*1.73;
  for(const side of [-1,1]){
   const rib=p('handguard',[
    [x,-1.04],[x+.38,-1.04],[x+.38,-2.50],[x,-2.50]
   ],.09,HK_DARK_POLYMER);
   rib.position.z=side*2.05;
   rib.userData.r870PumpPart=true;
  }
 }
 // The fore-end remains ONE logical moving assembly: pump body + 8
 // channels (9 authored meshes) for future hand-synchronized pump action.
 root.userData.r870P07=true;root.userData.r870P08=true;
 root.userData.r870P09=true;root.userData.r870P10=true;
 root.userData.r870PumpRearTravel=R870_P07.pumpRearTravel;
}
