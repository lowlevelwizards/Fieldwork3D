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
 // An item marked SECURED is no longer a loose gun on the floor. The
 // evidence tag stays in its recorded position for visual confirmation.
 private readonly tag=new THREE.MeshStandardMaterial({
  color:0xc9b481,roughness:1,metalness:0,flatShading:true});
 private readonly ink=new THREE.MeshStandardMaterial({
  color:0x23332d,roughness:1,metalness:0,flatShading:true});
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
  const evidence=new THREE.Group();
  evidence.name='secured-evidence-marker';
  const plate=new THREE.Mesh(new THREE.BoxGeometry(17,.85,14),this.tag);
  evidence.add(plate);
  // Two sturdy bars make a readable check mark without text textures,
  // billboards, or a second particle/render loop.
  const short=new THREE.Mesh(new THREE.BoxGeometry(2.4,1,7),this.ink);
  short.position.set(-3,.9,1.1);short.rotation.y=-.7;
  const long=new THREE.Mesh(new THREE.BoxGeometry(2.4,1,13),this.ink);
  long.position.set(2.4,.9,-1);long.rotation.y=.67;
  evidence.add(short,long);evidence.visible=false;
  root.add(evidence);
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
   // Only a loose firearm presents a pickup/rearm silhouette; a secured
   // item leaves a visible compact checked evidence marker instead.
   root.children[0].visible=item.status==='loose';
   root.children[1].visible=item.status==='secured';
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
  this.tag.dispose();this.ink.dispose();
 }
}
