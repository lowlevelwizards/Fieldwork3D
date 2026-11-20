/** Render-only view of physical Session-owned surrendered firearms.
 * One stable geometry/model per world object; never invent a gun from a pose.
 * Disclosure is supplied by the caller, not by this presenter or hidden AI.
 */
import * as THREE from 'three';
import type {DroppedFirearm} from '../breach-suspect-weapons.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../breach-weapon-geometry.ts';
import {buildWeaponAccessories} from '../breach-weapon-accessories.ts';
import {buildGlockAppearance}
 from '../weapons/geometry/glock-family-silhouettes.ts';

export class SurrenderedFirearmsPresenter{
 private readonly objects=new Map<number,THREE.Group>();
 private readonly metal=new THREE.MeshStandardMaterial({
  color:0x343c40,roughness:.85,metalness:.12,flatShading:true});
 private readonly polymer=new THREE.MeshStandardMaterial({
  color:0x25262d,roughness:.98,metalness:0,flatShading:true});
 constructor(private readonly scene:THREE.Scene){}
 private create(item:DroppedFirearm):THREE.Group{
  const root=new THREE.Group();
  root.name='surrendered-firearm-'+item.id;
  root.userData.fieldworkRenderCategory='equipment';
  let model:THREE.Group;
  if(item.secondaryWeapon){
   model=buildGlockAppearance(item.secondaryWeapon);
  }else{
   model=buildWeaponSilhouette(item.weapon,this.metal,this.polymer,
     item.weaponConfiguration);
   if(item.weaponConfiguration)
     model.add(buildWeaponAccessories(item.weaponConfiguration,
       this.metal,this.polymer));
  }
  model.rotation.x=Math.PI/2;
  model.scale.setScalar(item.secondaryWeapon?.65:.68);
  root.add(model);
  root.position.set(item.p.x,2.4,item.p.y);
  root.rotation.y=-item.heading;
  this.scene.add(root);
  this.objects.set(item.id,root);
  return root;
 }
 update(items:readonly DroppedFirearm[],
  isDisclosed:(item:DroppedFirearm)=>boolean):void{
  const retained=new Set<number>();
  for(const item of items){
   if(item.status==='retrieved')continue;
   retained.add(item.id);
   const root=this.objects.get(item.id)??this.create(item);
   root.position.set(item.p.x,2.4,item.p.y);
   root.rotation.y=-item.heading;
   root.visible=isDisclosed(item);
  }
  for(const [id,root] of this.objects)if(!retained.has(id)){
   this.scene.remove(root);
   clearWeaponSilhouette(root);
   this.objects.delete(id);
  }
 }
 clear():void{
  for(const root of this.objects.values()){
   this.scene.remove(root);
   clearWeaponSilhouette(root);
  }
  this.objects.clear();
 }
 dispose():void{
  this.clear();
  this.metal.dispose();
  this.polymer.dispose();
 }
}
