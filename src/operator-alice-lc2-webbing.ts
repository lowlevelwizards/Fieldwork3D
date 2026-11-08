/** R5F: US ALICE LC-2 nylon belt-based fighting load, not recolored PLCE.
 * The pelvic belt carries empty pouch shells and two covered canteens.
 * The independent Y harness mounts on the chest (see armor rig silhouettes).
 * All geometry cosmetic: actual magazines/supplies come from the ledger.
 */
import * as THREE from 'three';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import type {AliceLc2Load} from './operator-alice-lc2-policy.ts';
export type AliceLc2Waist={
 root:THREE.Group;magazineCases:THREE.Group;
 canteens:THREE.Group;utility:THREE.Group;
 rearPack:THREE.Group;load:AliceLc2Load;
};
const part=(g:THREE.Group,m:THREE.Material,
 x:number,y:number,z:number,w:number,h:number,d:number,name:string)=>{
 const geo=garmentBoxUV(new THREE.BoxGeometry(w,h,d),w,h,d,m,x,y,z);
 const mesh=new THREE.Mesh(geo,m);
 mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
 g.add(mesh);
};
const group=(parent:THREE.Group,name:string)=>{const x=new THREE.Group();x.name=name;parent.add(x);return x;};
export function createAliceLc2Waist(
 hip:THREE.Group,nylon:THREE.Material,pouch:THREE.Material,
 webbing:THREE.Material,hardware:THREE.Material):AliceLc2Waist{
 const root=new THREE.Group();root.name='alice-lc2-field-belt';
 root.visible=false;hip.add(root);
 // One sturdy, fully visible pistol belt; near-flat front and rear spans
 // wrap into two large side segments rather than separate disconnected tabs.
 part(root,webbing,4.55,.05,0,1.25,1.62,13.70,'LC2-front-belt');
 part(root,webbing,-4.52,.05,0,1.25,1.62,13.70,'LC2-rear-belt');
 for(const sign of [-1,1])
  part(root,webbing,0,.05,sign*6.45,9.25,1.62,1.10,'LC2-side-belt');
 // Distinct square buckle at the center, no shiny high-poly hardware.
 part(root,hardware,5.24,.05,0,.32,1.28,1.70,'LC2-belt-buckle');
 const magazineCases=group(root,'alice-magazine-cases');
 for(const side of [-1,1]){
  const z=side*7.02;
  // Front-hip twin magazine pouches with a big flap rather than PLCE's
  // broad weather-cover box and many rear belt cells.
  // The actual three staggered magazine sockets must remain within the
  // textile case, including the rearmost magazine in a full loadout.
  part(magazineCases,pouch,1.55,-.18,z,5.00,3.68,2.78,'LC2-dual-mag-pouch');
  part(magazineCases,pouch,4.12,1.17,z,.42,1.32,2.94,'LC2-cover-flap');
  part(magazineCases,webbing,4.37,.37,z,.30,1.13,.76,'LC2-closure-tab');
 }
 const canteens=group(root,'alice-covered-canteens');
 for(const side of [-1,1]){
  const z=side*7.30;
  // Large oblong covers sit behind magazine pouches and visibly bulk
  // out the two rear hips; no extra water supply is granted.
  part(canteens,nylon,-3.05,-.52,z,3.15,4.25,3.14,'LC2-canteen-cover');
  part(canteens,pouch,-1.30,1.05,z,.43,1.25,3.35,'LC2-canteen-flap');
 }
 const utility=group(root,'alice-field-utility');
 part(utility,pouch,-.62,-.12,7.55,2.72,2.85,2.18,'LC2-first-aid-pouch');
 part(utility,pouch,.83,.85,7.55,.32,.85,2.40,'LC2-first-aid-flap');
 const rearPack=group(root,'alice-small-rear-cargo');
 part(rearPack,pouch,-5.20,-.30,0,1.8,3.90,5.75,'LC2-patrol-rear-load');
 part(rearPack,pouch,-6.16,1.06,0,.35,1.08,6.12,'LC2-patrol-flap');
 for(const sec of [magazineCases,canteens,utility,rearPack])
  consolidateVisualGroup(sec);
 // Keep the named subgroups intact so variant updates require only visibility.
 const result={root,magazineCases,canteens,utility,rearPack,
  load:'standard' as AliceLc2Load};
 updateAliceLc2Load(result,'standard');
 return result;
}
export function updateAliceLc2Load(v:AliceLc2Waist,load:AliceLc2Load){
 v.load=load;
 v.magazineCases.visible=true;
 v.canteens.visible=load!=='light';
 v.utility.visible=load!=='light';
 v.rearPack.visible=load==='patrol';
}
