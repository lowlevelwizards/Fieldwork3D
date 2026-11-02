/** Authored style-specific surface construction for the same broad mechanical
 * armor, rig, belt and pack classes. All cosmetic; no additional capacity.
 */
import * as THREE from 'three';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import {wardrobeItemsForSlot} from './operator-wardrobe-data.ts';
type StyleGroups=Record<string,THREE.Group>;
export type WardrobeGearLayers={
 armor:StyleGroups;rig:StyleGroups;belt:StyleGroups;pack:StyleGroups;
};
const box=(g:THREE.Group,m:THREE.Material,
 x:number,y:number,z:number,w:number,h:number,d:number)=>{
 const mesh=new THREE.Mesh(mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d),m);
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
 const armor:StyleGroups={},rig:StyleGroups={},belt:StyleGroups={},pack:StyleGroups={};
 for(const item of wardrobeItemsForSlot('armorStyle')){
  const g=make(chest);armor[item.id]=g;
  switch(item.id){
   case 'plate-jpc':
    for(const z of [-4.9,4.9])
     box(g,gearFabric,7.94,4.85,z,1.0,1.45,2.2);
    break;
   case 'plate-heavy':
    for(const z of [-1,1]){
     box(g,armorFabric,1.0,-.8,z*8.05,4.5,5.5,1.35);
     box(g,gearFabric,7.94,-4.35,z*3.9,.56,2.0,3.6);
    }
    box(g,armorFabric,7.85,-5.7,0,.75,2.0,5.2);
    break;
   case 'plate-standard':
    box(g,gearFabric,7.9,.8,0,.35,1.25,8.6);
    break;
   case 'soft-paca':
    for(const z of [-1,1])
     box(g,gearFabric,6.85,-3.65,z*4.75,.23,.85,2.0);
    break;
   case 'soft-vest':
    box(g,dark,6.84,1.2,0,.22,.75,6.0);
    break;
   case 'soft-slick':case 'plate-slick':case 'armor-bare':
    break;
  }
 }
 for(const item of wardrobeItemsForSlot('rigStyle')){
  const g=make(chest);rig[item.id]=g;
  if(item.id==='micro-rig'||item.id==='chest-placard'){
   box(g,gearFabric,8.65,-3.4,0,.63,2.7,7.4);
   if(item.id==='chest-placard')
    for(const z of [-2.3,0,2.3])
     box(g,dark,9.03,-3.8,z,.22,2.2,1.6);
  }else if(item.id==='lbv'||item.id==='full-chest'){
   for(const z of [-5.6,5.6])
    box(g,gearFabric,3.0,-1.5,z,3.9,5.4,1.0);
  }else if(item.id==='belt-harness'){
   for(const z of [-5.4,5.4])
    box(g,gearFabric,-2.15,4.65,z,8.4,1.25,1.1);
  }else if(item.id==='field-webbing'){
   box(g,gearFabric,4.0,-4.6,0,1.3,1.05,12.9);
  }
 }
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
 for(const section of [armor,rig,belt,pack])
  for(const g of Object.values(section))consolidateVisualGroup(g);
 return {armor,rig,belt,pack};
}
export function updateWardrobeGearLayers(v:WardrobeGearLayers,
 armor:string,rig:string,belt:string,pack:string){
 for(const [target,id] of [
  [v.armor,armor],[v.rig,rig],[v.belt,belt],[v.pack,pack]
 ] as const)
  for(const [style,g] of Object.entries(target))g.visible=style===id;
}
