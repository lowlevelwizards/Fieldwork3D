/** Authored style-specific surface construction for the same broad mechanical
 * armor, rig, belt and pack classes. All cosmetic; no additional capacity.
 */
import * as THREE from 'three';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import {wardrobeItemsForSlot} from './operator-wardrobe-data.ts';
import {createArmorSilhouettes,createChestRigSilhouettes,
 updateAdaptiveArmorFit,updateFittedRigHarness}
 from './operator-armor-rig-silhouettes.ts';
import {armorAttachmentFrame} from './operator-armor-attachment-frame.ts';
import {rigContactFrame} from './operator-rig-contact-frame.ts';
type StyleGroups=Record<string,THREE.Group>;
export type WardrobeGearLayers={
 armor:StyleGroups;rig:StyleGroups;belt:StyleGroups;pack:StyleGroups;
 waistRig:StyleGroups;
 pouchMaterial:THREE.MeshStandardMaterial;
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
 // Cummerbunds, shoulder pads and secondary protective panels inherit the
 // ARMOR channel, never the rig's independent fabric swatch.
 const armor=createArmorSilhouettes(chest,armorFabric,armorFabric,dark,trim);
 const pouchMaterial=(gearFabric as THREE.MeshStandardMaterial).clone();
 pouchMaterial.name='Fieldwork authored rig pouch fabric';
 pouchMaterial.userData.fieldworkFabric=true;
 const rig=createChestRigSilhouettes(chest,gearFabric,pouchMaterial,dark,trim);
 // Two historically inspired belt and jacket loads follow the pelvis
 // while their independent shoulder suspenders follow the chest.
 const waistRig:StyleGroups={};
 const webbing=make(hip);waistRig['field-webbing']=webbing;
 box(webbing,gearFabric,4.35,.18,0,1.12,1.36,13.35);
 box(webbing,gearFabric,-4.15,.18,0,1.06,1.34,12.20);
 for(const side of [-1,1])
  for(const x of [2.30,-.65,-3.60]){
   box(webbing,pouchMaterial,x,.10,side*7.20,2.69,3.66,2.36);
   box(webbing,trim,x+1.37,1.49,side*7.20,.29,.57,2.49);
   // A clear, dark top opening shows where carried belt magazines sit.
   box(webbing,dark,x,1.88,side*8.42,2.02,.28,.19);
  }
 const battle=make(hip);waistRig['sadf-webbing']=battle;
 box(battle,gearFabric,4.26,.13,0,1.18,1.50,13.55);
 box(battle,gearFabric,-4.24,.13,0,1.10,1.48,12.55);
 for(const side of [-1,1]){
  for(const x of [2.1,-1.30])
   box(battle,pouchMaterial,x,.16,side*7.32,3.25,4.38,2.84);
  box(battle,gearFabric,-3.75,.12,side*5.4,1.16,4.15,5.15);
 }
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
 for(const section of [waistRig,belt,pack])
  for(const g of Object.values(section))consolidateVisualGroup(g);
 return {armor,rig,waistRig,belt,pack,pouchMaterial};
}
export function updateWardrobeGearLayers(v:WardrobeGearLayers,
 armor:string,rig:string,belt:string,pack:string,top='combat-shirt'){
 for(const [target,id] of [
  [v.armor,armor],[v.rig,rig],[v.belt,belt],[v.pack,pack]
 ] as const)
  for(const [style,g] of Object.entries(target))g.visible=style===id;
 for(const [style,g] of Object.entries(v.waistRig))g.visible=style===rig;
 // Changes to the selected garment rebuild the connectors once, not per pose.
 updateAdaptiveArmorFit(v.armor,armor,top);
 // The rig follows exactly the same fitted exterior as the plate bag.
 const exterior=(['micro-rig','chest-placard','light-rig','chicom-rig',
   'bandolier','split-front','full-chest','lbv',
   'field-webbing','sadf-webbing'].includes(rig))?
  rigContactFrame(armor,top,rig):armorAttachmentFrame(armor,top);
 for(const group of Object.values(v.rig)){
  group.position.x=exterior.rigShiftX;
  group.position.y=0;
  group.position.z=0;
 }
 // Harness straps remain distinct from pouch geometry and reach ABOVE the
 // selected uniform shoulder cap, including BDU collar and bulky Gorka hood.
 updateFittedRigHarness(v.rig,rig,top,exterior);
 // Placards can use a minimal standalone harness when no external carrier
 // provides attachment loops; never leave an unsupported slab floating.
 const placard=v.rig['chest-placard'];
 if(placard)for(const child of placard.children)
  if(child.name==='standalone-harness')
   child.visible=rig==='chest-placard'&&
    (!('mode' in exterior)||exterior.mode!=='carrier-placard');
}
