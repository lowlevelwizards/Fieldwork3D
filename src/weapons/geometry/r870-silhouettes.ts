/** R870 P08: one coherent, intentionally caricatured 18-inch Police-style 870.
 * This is the real Arsenal/rig/replay geometry builder, NOT a second lab mesh.
 * Six UI slots own distinct geometry while stock + wrist read as one solid
 * wood form; the tube is a FIXED feed exterior, not a detachable magazine.
 * +X forward, +Y up, +Z operator's right. Art only; no ballistics here.
 */
import * as THREE from 'three';
import {R870_P07} from './r870-art-contract.ts';
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {addOutline,addCuboid,addFacetedTube,type SlotName,type Outline}
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
  [-6.72,-1.91],[-7.16,-2.65],[-7.68,-3.12],
  [-8.16,-3.31],[-8.60,-3.24],[-9.01,-2.83],[-9.35,-2.60]
 ],3.19,HK_WOOD);
 // Low, big, recognizable receiver. No trigger-guard mini-mesh or rail.
 p('receiver',[
  [-6.18,1.30],[-5.53,1.69],[2.10,1.69],[2.88,1.13],
  [2.88,-1.41],[2.10,-1.96],[-5.47,-1.96],[-6.18,-1.40]
 ],3.47,HK_BLACK_METAL);
 p('receiver',[
  [-5.18,-1.90],[2.00,-1.90],[1.65,-2.12],[-4.90,-2.12]
 ],3.10,HK_DARK_POLYMER);
 // The ejection opening is an inset pair, not a luminous black decal.
 // A chunky outer recess and a smaller visible bolt plane give the port
 // readable depth at mobile scale. Both remain right-side ONLY.
 const port=p('receiver',[
  [-.33,.77],[2.03,.77],[1.83,-.12],[-.33,-.12]
 ],.095,FAL_VENT_SHADOW);
 port.position.z=1.765;
 port.userData.r870RightEjectionPort=true;
 const bolt=p('receiver',[
  [.05,.50],[1.70,.50],[1.60,.08],[.05,.08]
 ],.055,FAL_TRANSITION_METAL);
 bolt.position.z=1.827;
 bolt.userData.r870InsetBolt=true;
 // The short plain upper barrel and lower FIXED magazine tube are
 // independently authored six-sided bodies with clear side separation.
 const barrel=t('barrel',2.53,R870_P07.muzzleX,R870_P07.muzzleY,.69,HK_BLACK_METAL);
 // Six faces remain. Roll the cross-section to expose two broad angled
 // facets rather than presenting one flat vertical beam to the side view.
 barrel.rotation.x=Math.PI/6;
 barrel.userData.r870Barrel=true;
 const tubeBody=t('magazine',3.02,13.90,-.74,.60,HK_BLACK_METAL);
 tubeBody.rotation.x=Math.PI/6;
 tubeBody.userData.r870FixedTube=true;
 b('magazine',13.95,-.74,0,.56,1.18,1.48,FAL_MUZZLE_METAL);
 // One understated front bead. Not an AR-style tower.
 b('barrel',18.77,1.645,0,.30,.27,.36,FAL_MUZZLE_METAL);
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
 // Chunky but integrated rear pump shoulder; retain all 9 original moving
 // pieces for later hand-synchronized animation and easy part selection.
 const pump=p('handguard',[
  [2.72,-.06],[3.55,.47],[10.75,.47],[11.43,-.01],
  [11.43,-2.40],[10.83,-2.82],[3.55,-2.82],[2.72,-2.34]
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
 root.userData.r870P08=true;
 root.userData.r870PumpRearTravel=R870_P07.pumpRearTravel;
}
