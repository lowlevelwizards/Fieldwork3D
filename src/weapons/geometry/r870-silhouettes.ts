/** R870 P07: one coherent, intentionally caricatured 18-inch Police-style 870.
 * This is the real Arsenal/rig/replay geometry builder, NOT a second lab mesh.
 * Six UI slots own distinct geometry while stock + wrist read as one solid
 * wood form; the tube is a FIXED feed exterior, not a detachable magazine.
 * +X forward, +Y up, +Z operator's right. Art only; no ballistics here.
 */
import * as THREE from 'three';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {addOutline,addCuboid,addFacetedTube,type SlotName,type Outline}
 from './profile-primitives.ts';
import {HK_BLACK_METAL,HK_DARK_POLYMER,HK_WOOD,FAL_VENT_SHADOW,
 FAL_MUZZLE_METAL} from './weapon-visual-palette.ts';

/** The same landmarks must drive pose, shotgun muzzle and future pump motion. */
export const R870_P07=Object.freeze({
 stockX:-15.78,muzzleX:19.20,muzzleY:.94,
 pumpStartX:2.91,pumpEndX:11.43,pumpRearTravel:2.28,
 supportNearX:4.15,supportFarX:10.55,supportY:-2.0,
 primaryX:-7.80,primaryY:-2.70
});
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
 // A true broad shoulder / heel and pinched wrist, two connected low-poly
 // solids as in Fieldwork's AKM. The boundary edge is shared (not stacked
 // coplanar polygons) and the wrist is integral, never an AR pistol grip.
 p('stock',[
  [-15.45,1.06],[-12.78,1.16],[-10.95,1.04],[-9.20,.76],
  [-9.35,-2.60],[-10.18,-2.54],[-12.75,-3.75],[-15.45,-3.75]
 ],3.19,HK_WOOD);
 b('stock',-15.61,-1.34,0,.34,4.83,3.39,HK_DARK_POLYMER);
 p('grip',[
  [-9.20,.76],[-7.95,.70],[-6.08,.79],[-6.08,-1.83],
  [-6.72,-1.91],[-7.24,-2.80],[-7.67,-3.28],
  [-8.19,-3.51],[-8.66,-3.40],[-9.02,-2.87],[-9.35,-2.60]
 ],3.19,HK_WOOD);
 // Low, big, recognizable receiver. No trigger-guard mini-mesh or rail.
 p('receiver',[
  [-6.18,1.30],[-5.53,1.69],[2.10,1.69],[2.88,1.13],
  [2.88,-1.41],[2.10,-1.96],[-5.47,-1.96],[-6.18,-1.40]
 ],3.47,HK_BLACK_METAL);
 p('receiver',[
  [-5.18,-1.90],[2.00,-1.90],[1.65,-2.12],[-4.90,-2.12]
 ],3.10,HK_DARK_POLYMER);
 const port=p('receiver',[
  [-.21,.71],[1.97,.71],[1.81,0],[-.21,0]
 ],.065,FAL_VENT_SHADOW);
 port.position.z=1.756;
 port.userData.r870RightEjectionPort=true;
 // The short plain upper barrel and lower FIXED magazine tube are
 // independently authored six-sided bodies with clear side separation.
 const barrel=t('barrel',2.53,R870_P07.muzzleX,R870_P07.muzzleY,.69,HK_BLACK_METAL);
 barrel.userData.r870Barrel=true;
 const tubeBody=t('magazine',3.02,13.90,-.62,.60,HK_BLACK_METAL);
 tubeBody.userData.r870FixedTube=true;
 b('magazine',13.95,-.63,0,.56,1.18,1.48,FAL_MUZZLE_METAL);
 // One understated front bead. Not an AR-style tower.
 b('barrel',18.77,1.645,0,.30,.27,.36,FAL_MUZZLE_METAL);
 // P07 oversized corncob sleeve, named as ONE moving fore-end assembly.
 const pump=p('handguard',[
  [2.91,-.02],[3.52,.47],[10.75,.47],[11.43,-.01],
  [11.43,-2.40],[10.83,-2.82],[3.54,-2.82],[2.91,-2.36]
 ],3.45,HK_WOOD);
 pump.userData.r870PumpPart=true;
 // Four confident rib strokes, deliberately not a fine texture.
 for(let i=0;i<4;i++){
  const x=4.15+i*1.73;
  for(const side of [-1,1]){
   const rib=p('handguard',[
    [x,.10],[x+.31,.10],[x+.29,-2.53],[x+.06,-2.53]
   ],.078,HK_DARK_POLYMER);
   rib.position.z=side*1.76;
   rib.userData.r870PumpPart=true;
  }
 }
 // Explicit identity for a future deterministic action animation. The
 // first Arsenal milestone is a STATIC preview; don't pretend to pump in
 // live combat without support-hand / simulation synchronization.
 root.userData.r870P07=true;
 root.userData.r870PumpRearTravel=R870_P07.pumpRearTravel;
}
