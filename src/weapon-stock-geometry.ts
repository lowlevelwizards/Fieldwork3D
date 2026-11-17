/** Build-time stock mechanism, from the SAME validated config consumed by
 * the shot-time rigid firearm. There is no render-only folded-stock flag.
 * Rear stock meshes are reparented before optional batching, at most once
 * per assembled gun; no per-frame stock traversal or transformation.
 */
import * as THREE from 'three';
import type {WeaponConfiguration} from './equipment-weapon-assemblies.ts';
import {isUnderfoldStock,stockHingeX} from './weapon-stock-position.ts';

export function poseConfiguredStock(root:THREE.Group,
 config:WeaponConfiguration):boolean{
 const state=config.stockPosition;
 const stockId=config.build?.parts.stock;
 if(!stockId||!state)return false;
 const stockMeshes:THREE.Object3D[]=[];
 root.traverse(node=>{
  if(node instanceof THREE.Mesh&&
   node.name.startsWith('family-stock-'+stockId+'-'))
    stockMeshes.push(node);
 });
 if(!stockMeshes.length)return false;
 const hinge=stockHingeX(stockId);
 const mechanism=new THREE.Group();
 mechanism.name='mechanical-stock-'+state;
 mechanism.position.x=hinge;
 root.add(mechanism);
 root.updateMatrixWorld(true);
 for(const part of stockMeshes)mechanism.attach(part);
 if(state==='folded'){
  if(isUnderfoldStock(stockId)){
   // Underfolder tucks beneath the receiver along the lower fore-end.
   mechanism.rotation.z=2.72;
   mechanism.position.y=-1.8;
  }else{
   // Sidefolder sits along the receiver's right flank. The hinge pivot
   // is kept in place; no invisible shorter stock intersects the muzzle.
   mechanism.rotation.y=2.91;
   mechanism.position.z=1.65;
  }
 }else{
  // Extended-to-collapsed telescoping rails translate in toward the gun;
  // the saved stock contact / inertia uses precisely the same +4.8 units.
  mechanism.position.x+=4.8;
 }
 mechanism.updateMatrixWorld(true);
 root.userData.stockMechanism=state;
 return true;
}
