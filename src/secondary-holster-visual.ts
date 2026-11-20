/** S4A: real passive holster + belt pistol-magazine visuals on the SAME hip
 * bone used by the running operator. Never fabricates a combat firearm.
 * The S5 transition owner will hide/transfer the real pistol when drawn.
 * No frame allocations: rebuild only on loadout/holster identity changes.
 */
import * as THREE from 'three';
import {buildGlockAppearance,clearGlockAppearance,glockArtSockets,
 type GlockAppearanceId} from './weapons/geometry/glock-family-silhouettes.ts';
import type {SecondaryEquipment} from './secondary-equipment.ts';

type Mounted={signature:string;root:THREE.Group;model:THREE.Group|null};
const mounted=new WeakMap<THREE.Group,Mounted>();
const shellMaterial=()=>new THREE.MeshStandardMaterial({
 color:0x242d29,roughness:.94,metalness:.04,flatShading:true
});
const copyPaletteMaterials=(root:THREE.Group)=>{
 // OperatorRig.dispose() owns and disposes all attached materials; NEVER
 // attach global shared Glock palette objects directly to a live rig.
 const copies=new Map<THREE.Material,THREE.Material>();
 root.traverse(child=>{
  if(!(child instanceof THREE.Mesh))return;
  const clone=(material:THREE.Material)=>{
   if(!copies.has(material))copies.set(material,material.clone());
   return copies.get(material)!;
  };
  child.material=Array.isArray(child.material)?
   child.material.map(clone):clone(child.material);
 });
};
export function clearHipSecondaryVisual(hip:THREE.Group):void{
 const prior=mounted.get(hip);if(!prior)return;
 hip.remove(prior.root);
 prior.root.traverse(child=>{
  if(child instanceof THREE.Mesh){
   child.geometry.dispose();
   const mats=Array.isArray(child.material)?child.material:[child.material];
   for(const material of mats)material.dispose();
  }
 });
 prior.root.clear();mounted.delete(hip);
}
export function syncHipSecondaryVisual(hip:THREE.Group,
 state:SecondaryEquipment|undefined,hasBelt:boolean):THREE.Group|null{
 const valid=state?.weapon&&hasBelt?state.weapon:null;
 const signature=valid?[
  valid,state!.holster,
  ...state!.spareMagazines.map(m=>m.id+':'+m.location)
 ].join('|'):'none';
 const cached=mounted.get(hip);
 if(cached?.signature===signature)return cached.root;
 clearHipSecondaryVisual(hip);
 if(!valid)return null;
 const side=state!.holster==='belt-right'?1:-1;
 const mount=new THREE.Group();
 mount.name='secondary-hip-carry';
 mount.userData.secondaryHolsterOccupied=true;
 mount.userData.secondaryWeaponId=valid;
 mount.userData.secondaryHolsterSide=state!.holster;
 mount.position.set(.2,-3.6,side*9.25);
 const pistol=buildGlockAppearance(valid as GlockAppearanceId);
 copyPaletteMaterials(pistol);
 const socket=glockArtSockets(valid as GlockAppearanceId).holsterPivot;
 const pivot=new THREE.Group();
 pivot.name='secondary-holster-pivot';
 pivot.scale.setScalar(.37);
 pivot.rotation.z=-Math.PI/2;
 pistol.position.set(-socket.x,-socket.y,-socket.z);
 pivot.add(pistol);mount.add(pivot);
 // One chunky, nearly featureless retention shell. The true Glock geometry
 // remains visible at the grip and stays physically attached to the hip.
 const shell=new THREE.Mesh(new THREE.BoxGeometry(3.3,5.3,2.1),shellMaterial());
 shell.name='secondary-holster-shell';
 shell.position.set(-1,-2.5,0);
 shell.castShadow=true;shell.receiveShadow=true;
 mount.add(shell);
 hip.add(mount);
 // Distinct physical spare magazine silhouettes only where actually BELT
 // carried. Rig/backpack and pocket pouches belong to their own S4 sockets.
 let beltIndex=0;
 for(const magazine of state!.spareMagazines){
  if(magazine.location!=='belt'||beltIndex>=3)continue;
  const pouch=new THREE.Mesh(new THREE.BoxGeometry(1.25,2.35,1.65),
   shellMaterial());
  pouch.name='secondary-magazine-pouch-'+magazine.id;
  pouch.userData.secondaryMagazineId=magazine.id;
  pouch.position.set(1.1+beltIndex*1.55,-2.6,-side*9.1);
  pouch.castShadow=true;pouch.receiveShadow=true;
  mount.add(pouch); // one owned root, one deterministic disposal path
  pouch.position.set(1.1+beltIndex*1.55,-2.6,
   -side*18.35); // root is offset side*9.25: opposite belt in hip space
  beltIndex++;
 }
 const entry={signature,root:mount,model:pistol};
 mounted.set(hip,entry);
 return mount;
}
