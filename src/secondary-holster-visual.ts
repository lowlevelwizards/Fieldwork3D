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
import type {SecondaryTimedReload} from './secondary-timed-reload.ts';

type Mounted={signature:string;root:THREE.Group;ownedRoots:THREE.Group[];
 holster:THREE.Group;cradle:THREE.Group;
 /** Magazine changes cannot destroy/replace the held Glock model. */
 pouchSignature:string;physicalPouches:Map<string,THREE.Mesh>;
 /** Real visible magazine floorplate is part of the existing Glock model. */
 insertedFloorplate:THREE.Mesh|null;
 /** Immutable stowed socket for deterministic, seek-safe draws. */
 stowedPosition:THREE.Vector3;stowedQuaternion:THREE.Quaternion;
 /** Reused pose scratch: a live Glock must not allocate vectors every frame. */
 gripWorld:THREE.Vector3;targetLocal:THREE.Vector3;
 targetWorldRotation:THREE.Quaternion;parentWorldRotation:THREE.Quaternion;
 flashWorld:THREE.Vector3;pouchRest:THREE.Vector3;
 labPitchRotation:THREE.Quaternion;
};
const mounted=new WeakMap<THREE.Group,Mounted>();
const WORLD_UP=new THREE.Vector3(0,1,0);
const LAB_PITCH_AXIS=new THREE.Vector3(0,0,1);
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
 location:Exclude<SecondaryMagazineLocation,'overflow'>,side:number)=>{
 // One unmistakable upright chunk per physically carried pistol magazine.
 // No giant billboard, stacked fake rounds, or copy of primary magazines.
 const item=new THREE.Mesh(new THREE.BoxGeometry(1.45,2.5,1.85),
  pouchMaterial());
 item.name='secondary-magazine-pouch-'+id;
 item.userData.secondaryMagazineId=id;
 item.userData.secondaryMagazineLocation=location;
 item.userData.secondaryMagazineIndex=index;
 item.castShadow=true;item.receiveShadow=true;
 item.position.copy(pouchSocket(location,index,side));
 parent.add(item);
 return item;
};
/** Update separately-owned carried magazines without ever rebuilding a
 * drawn Glock when its loaded/spare IDs change at the .72 insertion event.
 * A physical item has one ID, one attachment and one mesh.
 */
function reconcilePouches(mount:Mounted,state:SecondaryEquipment,
 chest?:THREE.Group,pack?:THREE.Object3D):void{
 const nextSig=state.spareMagazines.map(m=>m.id+':'+m.location).join('|');
 if(mount.pouchSignature===nextSig)return;
 const retained=new Set<string>();
 const counts={rig:0,belt:0,backpack:0,pocket:0};
 const side=state.holster==='belt-right'?1:-1;
 const targetFor=(place:'rig'|'belt'|'backpack'|'pocket')=>{
  if(place==='belt'||place==='pocket')return mount.root;
  const name=place==='rig'?'secondary-rig-carry':'secondary-pack-carry';
  const bone=place==='rig'?chest:pack;
  if(!bone)return null;
  let parent=mount.ownedRoots.find(r=>r.name===name);
  if(!parent){
   parent=new THREE.Group();parent.name=name;
   bone.add(parent);mount.ownedRoots.push(parent);
  }
  return parent;
 };
 for(const mag of state.spareMagazines){
  if(mag.location==='overflow')continue;
  const place=mag.location;
  const index=counts[place]++;
  const parent=targetFor(place);
  if(!parent||index>=4)continue;
  retained.add(mag.id);
  let item=mount.physicalPouches.get(mag.id);
  if(item&&item.parent!==parent){
   item.parent?.remove(item);parent.add(item);
  }
  if(!item){
   item=pouch(parent,mag.id,index,place,side);
   mount.physicalPouches.set(mag.id,item);
  }else{
   // Reuse the exact mesh but update the physical carrier placement.
   item.userData.secondaryMagazineIndex=index;
   const prior=mount.physicalPouches.get(mag.id);
   if(prior&&prior.userData.secondaryMagazineLocation!==place){
    prior.userData.secondaryMagazineLocation=place;
   }
   const slot=pouchSocket(place,index,side);
   item.position.copy(slot);
  }
 }
 for(const [id,item] of mount.physicalPouches){
  if(retained.has(id))continue;
  item.parent?.remove(item);item.geometry.dispose();
  for(const m of Array.isArray(item.material)?item.material:[item.material])
   m.dispose();
  mount.physicalPouches.delete(id);
 }
 mount.pouchSignature=nextSig;
}
/** Single location recipe for new and retained physical magazine meshes. */
function pouchSocket(location:'rig'|'belt'|'backpack'|'pocket',
 index:number,side:number,out=new THREE.Vector3()):THREE.Vector3{
 if(location==='belt')return out.set(2+index*1.8,-3.8,-side*8.8);
 if(location==='pocket')return out.set(-1.5,-4.4,-side*6.4);
 if(location==='rig')return out.set(8.95,-5.3,-2.8+index*2.3);
 return out.set(-1.4,-3.4,side*(6.4+index*2.1));
}

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
  Boolean(chest),Boolean(pack)
 ].join('|'):'none';
 const prior=mounted.get(hip);
 // S8: changing inserted/spare magazine IDs is NOT a weapon swap.
 // Preserve the drawn rig's model, geometry, materials and hand attachment.
 if(prior?.signature===signature){
  reconcilePouches(prior,state!,chest,pack);
  return prior.root;
 }
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
 const current:Mounted={signature,root,ownedRoots,holster,cradle,
  pouchSignature:'',physicalPouches:new Map(),
  insertedFloorplate:(()=>{
    let floor:THREE.Mesh|null=null;
    pistol.traverse(child=>{
      if(child instanceof THREE.Mesh&&child.userData.glockMagazineFloorplate)
       floor=child;
    });
    return floor;
  })(),
  stowedPosition:cradle.position.clone(),
  stowedQuaternion:cradle.quaternion.clone(),
  gripWorld:new THREE.Vector3(),targetLocal:new THREE.Vector3(),
  targetWorldRotation:new THREE.Quaternion(),parentWorldRotation:new THREE.Quaternion(),
  flashWorld:new THREE.Vector3(),pouchRest:new THREE.Vector3(),
  labPitchRotation:new THREE.Quaternion()};
 mounted.set(hip,current);
 reconcilePouches(current,state!,chest,pack);
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
 fraction:number,operational=true,shotHeading?:number,
 labPitch=0,labScale?:number):boolean{
 const mount=mounted.get(hip);
 if(!mount||!secondary?.weapon||mount.root.userData.secondaryWeaponId!==secondary.weapon){
  return false;
 }
 const weight=operational&&Number.isFinite(fraction)?
  Math.max(0,Math.min(1,fraction)):0;
 // No gameplay transform changes: only the Operator Lab passes labScale.
 // Retain the authentic authored grip pivot across sizes and draw states.
 const scale=labScale!==undefined&&Number.isFinite(labScale)?
  Math.max(.37,Math.min(.8,labScale)):.37;
 if(mount.cradle.scale.x!==scale)mount.cradle.scale.setScalar(scale);
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
 const gripWorld=firingHand.getWorldPosition(mount.gripWorld);
 const target=mount.holster.worldToLocal(mount.targetLocal.copy(gripWorld));
 // An actively aiming pistol must rotate its actual authored +X barrel
 // toward the SAME fixed-step yaw used by the shot resolver, not merely
 // the character's torso direction. Retain chest-relative fallback for
 // old Lab fixtures which have no recorded shot heading.
 const targetWorldRotation=Number.isFinite(shotHeading)?
  mount.targetWorldRotation.setFromAxisAngle(
   WORLD_UP,-shotHeading!):
  chest.getWorldQuaternion(mount.targetWorldRotation);
 // Laboratory display only: pitch the model for high/low-ready and recoil.
 // Gameplay shot-time geometry and firing authority are unchanged.
 if(Number.isFinite(labPitch)&&labPitch!==0)
  targetWorldRotation.multiply(mount.labPitchRotation.setFromAxisAngle(
   LAB_PITCH_AXIS,Math.max(-.9,Math.min(.9,labPitch))));
 const parentWorldRotation=mount.holster.getWorldQuaternion(mount.parentWorldRotation);
 const targetRotation=parentWorldRotation.invert().multiply(targetWorldRotation);
 // A curved, controlled draw path clears the holster before rotating into
 // the firing grip. No per-frame mesh or material allocations.
 const blend=weight*weight*(3-2*weight);
 mount.cradle.position.copy(mount.stowedPosition).lerp(target,blend);
 mount.cradle.position.y+=Math.sin(Math.PI*blend)*2.4;
 mount.cradle.quaternion.copy(mount.stowedQuaternion).slerp(targetRotation,blend);
 return weight>=1;
}

/** S7.3: reuse the EXISTING actor muzzle flash, never a second effect mesh.
 * The physical Glock cradle owns geometry only; its cached disposal cannot
 * accidentally dispose this actor-owned flash when the loadout changes.
 * The world point comes from the SAME artwork muzzle socket as S7 ballistics.
 */
export function presentSecondaryMuzzleFlash(
 root:THREE.Group,primary:THREE.Group,flash:THREE.Object3D,
 hip:THREE.Group,sidearm:SecondaryEquipment|undefined,
 fraction:number,primaryTipX:number,primaryTipY:number):void{
 const mount=mounted.get(hip);
 const drawn=!!mount&&!!sidearm?.weapon&&
  mount.root.userData.secondaryWeaponId===sidearm.weapon&&
  Number.isFinite(fraction)&&fraction>=1;
 if(!drawn){
  if(flash.parent!==primary)primary.add(flash);
  flash.position.set(primaryTipX,primaryTipY,0);
  return;
 }
 const sockets=glockArtSockets(sidearm!.weapon as GlockAppearanceId);
 // The pistol is already moved to its solved wrist by poseOperator().
 const point=mount!.flashWorld.set(
  sockets.muzzle.x-sockets.holsterPivot.x,
  sockets.muzzle.y-sockets.holsterPivot.y,
  sockets.muzzle.z-sockets.holsterPivot.z);
 mount!.cradle.updateWorldMatrix(true,false);
 mount!.cradle.localToWorld(point);
 if(flash.parent!==root)root.add(flash);
 root.updateWorldMatrix(true,false);
 flash.position.copy(root.worldToLocal(point));
}

/** S8.3: real selected spare magazine travels from its authored physical
 * carrier socket into the existing solved support wrist. The same ONE mesh
 * returns to its original mount after cancellation or replay rewind.
 * The inserted Glock floorplate is hidden only during the actual handoff.
 * Inventory/insert/drop timing remains exclusively simulation-owned.
 */
export function presentSecondaryReload(hip:THREE.Group,
 supportHand:THREE.Object3D,kit:SecondaryEquipment|undefined,
 reload:SecondaryTimedReload|null|undefined):void{
 const mount=mounted.get(hip);
 if(!mount||!kit?.weapon||mount.root.userData.secondaryWeaponId!==kit.weapon)
  return;
 const progress=reload&&reload.duration>0?
  Math.max(0,Math.min(1,reload.elapsed/reload.duration)):0;
 const active=!!reload&&Number.isFinite(progress)&&
  kit.spareMagazines.some(m=>m.id===reload.selectedId);
 if(mount.insertedFloorplate)
  mount.insertedFloorplate.visible=!active||progress<.30||progress>=.72;
 for(const [id,mesh] of mount.physicalPouches){
  const loc=mesh.userData.secondaryMagazineLocation as
    'rig'|'belt'|'backpack'|'pocket';
  const slot=mesh.userData.secondaryMagazineIndex as number;
  const original=pouchSocket(loc,slot,
   kit.holster==='belt-right'?1:-1,mount.pouchRest);
  mesh.position.copy(original);
  mesh.rotation.set(0,0,0);
  mesh.visible=true;
  if(!active||id!==reload!.selectedId||!mesh.parent)continue;
  // No viewport- or RAF-owned motion. This is a seek-safe function of
  // the actual timed simulation reload phase and existing wrist.
  const lift=progress<=.26?0:progress>=.66?1:
    Math.max(0,Math.min(1,(progress-.26)/.40));
  if(lift<=0)continue;
  const ease=lift*lift*(3-2*lift);
  supportHand.updateWorldMatrix(true,false);
  mesh.parent.updateWorldMatrix(true,false);
  const hand=mount.gripWorld;
  supportHand.getWorldPosition(hand);
  const local=mesh.parent.worldToLocal(mount.targetLocal.copy(hand));
  mesh.position.lerp(local,ease);
  mesh.rotation.z=-.24*ease;
  // Once actually inserted at .72, the inventory exchange will remove
  // this spare serial and the existing Glock floorplate reappears.
 }
}
