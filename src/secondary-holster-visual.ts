/** S4: passive, physically issued Glock carry on existing operator bones.
 * All placements use the legacy +X-forward / +Z-right operator coordinate
 * frame, NEVER the public -Z forward frame or weapon mesh art coordinates.
 * No weapon authority, combat ammo changes, per-frame mesh rebuilds or
 * world-space floating inventory. S5 owns visibility while drawing.
 */
import * as THREE from 'three';
import {buildGlockAppearance,glockArtSockets,
 type GlockAppearanceId} from './weapons/geometry/glock-family-silhouettes.ts';
import type {SecondaryEquipment,SecondaryMagazineLocation}
 from './secondary-equipment.ts';

type Mounted={signature:string;root:THREE.Group;ownedRoots:THREE.Group[];
 holster:THREE.Group;cradle:THREE.Group;
 /** Immutable stowed socket for deterministic, seek-safe draws. */
 stowedPosition:THREE.Vector3;stowedQuaternion:THREE.Quaternion;
};
const mounted=new WeakMap<THREE.Group,Mounted>();
const pouchMaterial=()=>new THREE.MeshStandardMaterial({
 color:0x2a3430,roughness:.96,metalness:0,flatShading:true
});
const copyPaletteMaterials=(root:THREE.Group)=>{
 // Rigs dispose mesh materials. Glock Arsenal palette objects are globally
 // shared: every rig owns clones, even on immediate hot-swap/destruction.
 const copies=new Map<THREE.Material,THREE.Material>();
 root.traverse(child=>{
  if(!(child instanceof THREE.Mesh))return;
  const clone=(m:THREE.Material)=>{
   let local=copies.get(m);
   if(!local){local=m.clone();copies.set(m,local);}
   return local;
  };
  child.material=Array.isArray(child.material)?
   child.material.map(clone):clone(child.material);
 });
};
function disposeOwned(root:THREE.Group){
 const geometries=new Set<THREE.BufferGeometry>();
 const materials=new Set<THREE.Material>();
 root.traverse(child=>{
  if(!(child instanceof THREE.Mesh))return;
  geometries.add(child.geometry);
  for(const m of Array.isArray(child.material)?child.material:[child.material])
   materials.add(m);
 });
 for(const g of geometries)g.dispose();
 for(const m of materials)m.dispose();
 root.parent?.remove(root);
 root.clear();
}
export function clearHipSecondaryVisual(hip:THREE.Group):void{
 const prev=mounted.get(hip);
 if(!prev)return;
 for(const root of prev.ownedRoots)disposeOwned(root);
 mounted.delete(hip);
}
const pouch=(parent:THREE.Group,id:string,index:number,
 location:SecondaryMagazineLocation,side:number)=>{
 // One unmistakable upright chunk per physically carried pistol magazine.
 // No giant billboard, stacked fake rounds, or copy of primary magazines.
 const item=new THREE.Mesh(new THREE.BoxGeometry(1.45,2.5,1.85),
  pouchMaterial());
 item.name='secondary-magazine-pouch-'+id;
 item.userData.secondaryMagazineId=id;
 item.userData.secondaryMagazineLocation=location;
 item.castShadow=true;item.receiveShadow=true;
 if(location==='belt')item.position.set(2.0+index*1.8,-3.8,-side*8.8);
 else if(location==='pocket')item.position.set(-1.5,-4.4,-side*6.4);
 else if(location==='rig')item.position.set(8.95,-5.3,-2.8+index*2.3);
 else item.position.set(-1.4,-3.4,side*(6.4+index*2.1));
 parent.add(item);
 return item;
};
/** Optional chest and pack anchors support actual multi-location cargo.
 * The wrapper remains compatible with legacy hip-only Operator Lab fixtures.
 * Caller supplies hip/chest/pack from the SAME rig: all follow the body.
 */
export function syncHipSecondaryVisual(hip:THREE.Group,
 state:SecondaryEquipment|undefined,hasBelt:boolean,
 chest?:THREE.Group,pack?:THREE.Object3D):THREE.Group|null{
 const valid=state?.weapon&&hasBelt?state.weapon:null;
 const signature=valid?[
  valid,state!.holster,JSON.stringify(state!.customization??null),
  Boolean(chest),Boolean(pack),
  ...state!.spareMagazines.map(m=>m.id+':'+m.location)
 ].join('|'):'none';
 const prior=mounted.get(hip);
 if(prior?.signature===signature)return prior.root;
 clearHipSecondaryVisual(hip);
 if(!valid)return null;
 const side=state!.holster==='belt-right'?1:-1;
 const root=new THREE.Group();root.name='secondary-hip-carry';
 root.userData.secondaryHolsterOccupied=true;
 root.userData.secondaryWeaponId=valid;
 root.userData.secondaryHolsterSide=state!.holster;
 const holster=new THREE.Group();
 holster.name='secondary-holster-mount';
 holster.position.set(.2,-3.6,side*9.25);
 const pistol=buildGlockAppearance(valid as GlockAppearanceId,{
  customization:state!.customization
 });
 copyPaletteMaterials(pistol);
 const socket=glockArtSockets(valid as GlockAppearanceId).holsterPivot;
 const cradle=new THREE.Group();
 cradle.name='secondary-holstered-pistol';
 cradle.userData.secondaryWeaponVisual=true;
 cradle.scale.setScalar(.37);
 cradle.rotation.z=-Math.PI/2;
 pistol.position.set(-socket.x,-socket.y,-socket.z);
 cradle.add(pistol);holster.add(cradle);
 const shell=new THREE.Mesh(new THREE.BoxGeometry(3.3,5.3,2.1),pouchMaterial());
 shell.name='secondary-holster-shell';
 shell.position.set(-1,-2.5,0);
 shell.castShadow=true;shell.receiveShadow=true;holster.add(shell);
 root.add(holster);hip.add(root);
 const ownedRoots=[root];
 const counts={rig:0,belt:0,backpack:0,pocket:0};
 for(const mag of state!.spareMagazines){
  if(mag.location==='overflow')continue;
  const place=mag.location;
  const index=counts[place]++;
  let target=root;
  if(place==='rig'&&chest){
   // Separate transform owner: torso lean and pitch follow chest.
   target=ownedRoots.find(x=>x.name==='secondary-rig-carry')!;
   if(!target){
    target=new THREE.Group();target.name='secondary-rig-carry';
    chest.add(target);ownedRoots.push(target);
   }
  }else if(place==='backpack'&&pack){
   // Backpacks use their existing -X mounted socket, not a guessed hip offset.
   target=ownedRoots.find(x=>x.name==='secondary-pack-carry')!;
   if(!target){
    target=new THREE.Group();target.name='secondary-pack-carry';
    pack.add(target);ownedRoots.push(target);
   }
  }
  // With no torso or pack attachment (legacy lab), do not fake a pouch
  // at the hip for non-hip locations. The item remains in live inventory.
  if((place==='rig'&&!chest)||(place==='backpack'&&!pack))continue;
  if(index>=4)continue;
  pouch(target,mag.id,index,place,side);
 }
 mounted.set(hip,{signature,root,ownedRoots,holster,cradle,
  stowedPosition:cradle.position.clone(),
  stowedQuaternion:cradle.quaternion.clone()});
 return root;
}

/** S6.1 presentation-only transfer of the ONE issued 3D Glock.
 * Its mesh remains owned by the same disposable hip holster assembly;
 * only the cradle transform changes after the main six-stage pose commit.
 * No second pistol mesh, new magazines, simulation changes or render clocks.
 * Motion derives exclusively from the recorded fixed-step switch fraction,
 * making replay seeking/reversal deterministic.
 */
export function presentSecondaryDraw(hip:THREE.Group,
 firingHand:THREE.Object3D,secondary:SecondaryEquipment|undefined,
 fraction:number,operational=true):boolean{
 const mount=mounted.get(hip);
 if(!mount||!secondary?.weapon||mount.root.userData.secondaryWeaponId!==secondary.weapon){
  return false;
 }
 const weight=operational&&Number.isFinite(fraction)?
  Math.max(0,Math.min(1,fraction)):0;
 if(weight===0){
  mount.cradle.position.copy(mount.stowedPosition);
  mount.cradle.quaternion.copy(mount.stowedQuaternion);
  return false;
 }
 // The authored Glock grip/holster pivot sits at the socket origin.
 // A single actual firing wrist decides the held grip position. Its weapon
 // forward/up axes are chest-local; palm animation will be refined in S6.2.
 const chest=firingHand.parent;
 if(!chest)return false;
 mount.holster.updateWorldMatrix(true,false);
 firingHand.updateWorldMatrix(true,false);
 const gripWorld=firingHand.getWorldPosition(new THREE.Vector3());
 const target=mount.holster.worldToLocal(gripWorld);
 const targetWorldRotation=chest.getWorldQuaternion(new THREE.Quaternion());
 const parentWorldRotation=mount.holster.getWorldQuaternion(new THREE.Quaternion());
 const targetRotation=parentWorldRotation.invert().multiply(targetWorldRotation);
 // A curved, controlled draw path clears the holster before rotating into
 // the firing grip. No per-frame mesh or material allocations.
 const blend=weight*weight*(3-2*weight);
 mount.cradle.position.copy(mount.stowedPosition).lerp(target,blend);
 mount.cradle.position.y+=Math.sin(Math.PI*blend)*2.4;
 mount.cradle.quaternion.copy(mount.stowedQuaternion).slerp(targetRotation,blend);
 return weight>=1;
}
