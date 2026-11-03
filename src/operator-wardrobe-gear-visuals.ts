/** Authored style-specific surface construction for the same broad mechanical
 * armor, rig, belt and pack classes. All cosmetic; no additional capacity.
 */
import * as THREE from 'three';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import {wardrobeItemsForSlot} from './operator-wardrobe-data.ts';
import {createArmorSilhouettes,createChestRigSilhouettes,
 ARMOR_PROFILES} from './operator-armor-rig-silhouettes.ts';
type StyleGroups=Record<string,THREE.Group>;
export type WardrobeGearLayers={
 armor:StyleGroups;rig:StyleGroups;belt:StyleGroups;pack:StyleGroups;
};
const box=(g:THREE.Group,m:THREE.Material,
 x:number,y:number,z:number,w:number,h:number,d:number)=>{
 const mesh=new THREE.Mesh(garmentBoxUV(new THREE.BoxGeometry(w,h,d),w,h,d,m,x,y,z),m);
 mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
 g.add(mesh);return mesh;
};
const make=(parent:THREE.Object3D)=>{
 const g=new THREE.Group();g.visible=false;parent.add(g);return g;
};
export function createWardrobeGearLayers(
 chest:THREE.Group,hip:THREE.Group,packParent:THREE.Mesh,
 armorFabric:THREE.Material,gearFabric:THREE.Material,
 packFabric:THREE.Material,dark:THREE.Material,
 trim:THREE.Material):WardrobeGearLayers{
 // Complete authored silhouettes replace all superficial generic shell
 // scale variants. The same outfit can be rendered over any armor or rig.
 const armor=createArmorSilhouettes(chest,armorFabric,gearFabric,dark,trim);
 const rig=createChestRigSilhouettes(chest,gearFabric,dark,trim);
 const belt:StyleGroups={},pack:StyleGroups={};
 for(const item of wardrobeItemsForSlot('beltStyle')){
  const g=make(hip);belt[item.id]=g;
  if(item.id==='padded-belt'){
   for(const z of [-5.65,5.65])
    box(g,gearFabric,-1.8,-2.2,z,2.8,2.4,.85);
  }else if(item.id==='battle-belt'||item.id==='duty-belt'){
   for(const z of [-4.8,4.8])
    box(g,dark,2.2,-2.0,z,.85,2.4,1.6);
  }
 }
 for(const item of wardrobeItemsForSlot('packStyle')){
  const g=make(packParent);pack[item.id]=g;
  switch(item.id){
   case 'hydration':
    box(g,dark,-1.9,2.2,0,.25,3.7,2.6);break;
   case 'admin-pack':
    box(g,packFabric,-2.9,-1.4,0,1.5,2.5,5.2);break;
   case 'assault-pack':
    box(g,packFabric,-3.35,-2.9,0,1.65,3.6,8.8);
    break;
   case 'sling-bag':
    box(g,gearFabric,-2.9,.7,-3.35,.5,5.9,.85);break;
   case 'rucksack':
    box(g,packFabric,-3.95,7.4,0,1.0,3.7,11.4);
    break;
   case 'medic-pack':
    box(g,gearFabric,-3.86,1.65,0,.35,3.8,4.0);
    box(g,dark,-4.1,1.65,0,.24,2.5,.65);
    box(g,dark,-4.1,1.65,0,.24,.65,2.5);
    break;
   case 'comms-pack':
    box(g,dark,-3.9,5.7,2.8,.3,5.4,.36);
    box(g,dark,-3.9,5.7,-2.8,.3,5.4,.36);break;
   case 'duffel':
    for(const z of [-4.6,4.6])
     box(g,trim,-3.95,.2,z,.3,8.1,.7);
    break;
   default:break;
  }
 }
 for(const section of [belt,pack])
  for(const g of Object.values(section))consolidateVisualGroup(g);
 return {armor,rig,belt,pack};
}
export function updateWardrobeGearLayers(v:WardrobeGearLayers,
 armor:string,rig:string,belt:string,pack:string){
 for(const [target,id] of [
  [v.armor,armor],[v.rig,rig],[v.belt,belt],[v.pack,pack]
 ] as const)
  for(const [style,g] of Object.entries(target))g.visible=style===id;
 // One consistent bearing surface: fit the complete rig slightly outside
 // the selected plate/soft-armor shell without scaling straps/pouches.
 const armorSurface=(ARMOR_PROFILES[armor]??ARMOR_PROFILES['armor-bare']).front;
 const mountDelta=armorSurface-ARMOR_PROFILES['plate-standard'].front;
 for(const group of Object.values(v.rig))group.position.x=mountDelta;
}
