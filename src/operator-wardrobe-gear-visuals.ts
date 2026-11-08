/** Authored style-specific surface construction for the same broad mechanical
 * armor, rig, belt and pack classes. All cosmetic; no additional capacity.
 */
import * as THREE from 'three';
import {createM1956Waist,updateM1956Variant,type M1956Waist} from './operator-m1956-webbing.ts';
import {type M1956Variant} from './operator-m1956-policy.ts';
import {createAliceLc2Waist,updateAliceLc2Load,
 type AliceLc2Waist} from './operator-alice-lc2-webbing.ts';
import type {AliceLc2Load} from './operator-alice-lc2-policy.ts';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import {enableBakedGearAO,bakeGearContactAO} from './operator-baked-gear-ao.ts';
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
 strapMaterial:THREE.MeshStandardMaterial;
 /** Battlefield-only factories: styles are constructed on first equip. */
 ensureArmor?:(style:string)=>void;ensureRig?:(style:string)=>void;
 aliceWaist?:AliceLc2Waist;ensureAliceWaist?:()=>void;
 m1956Waist?:M1956Waist;ensureM1956Waist?:()=>void;
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
 trim:THREE.Material,lazyVariants=false):WardrobeGearLayers{
 // Standalone Operator Labs receive identical baked AO to gameplay rigs.
 for(const material of [armorFabric,gearFabric,packFabric,trim])
  if(material instanceof THREE.MeshStandardMaterial)
   material.userData.fieldworkStudioSoftGear=true;
 for(const material of [armorFabric,gearFabric,packFabric])
  if(material instanceof THREE.MeshStandardMaterial)enableBakedGearAO(material);
 // Complete authored silhouettes replace all superficial generic shell
 // scale variants. The same outfit can be rendered over any armor or rig.
 // Cummerbunds, shoulder pads and secondary protective panels inherit the
 // ARMOR channel, never the rig's independent fabric swatch.
 const armor=createArmorSilhouettes(chest,armorFabric,armorFabric,dark,trim,
  lazyVariants?'armor-bare':undefined);
 const ensureArmor=lazyVariants?(style:string)=>{
  if(!armor[style])Object.assign(armor,
   createArmorSilhouettes(chest,armorFabric,armorFabric,dark,trim,style));
 }:undefined;
 const pouchMaterial=(gearFabric as THREE.MeshStandardMaterial).clone();
 pouchMaterial.name='Fieldwork authored rig pouch fabric';
 pouchMaterial.userData.fieldworkFabric=true;
 const strapMaterial=(gearFabric as THREE.MeshStandardMaterial).clone();
 strapMaterial.name='Fieldwork authored rig structural webbing';
 enableBakedGearAO(pouchMaterial);enableBakedGearAO(strapMaterial);
 strapMaterial.userData.fieldworkFabric=true;
 const rig=createChestRigSilhouettes(chest,gearFabric,pouchMaterial,
  dark,trim,strapMaterial,lazyVariants?'no-rig':undefined);
 const ensureRig=lazyVariants?(style:string)=>{
  if(!rig[style])Object.assign(rig,
   createChestRigSilhouettes(chest,gearFabric,pouchMaterial,
    dark,trim,strapMaterial,style));
 }:undefined;
 // Two historically inspired belt and jacket loads follow the pelvis
 // while their independent shoulder suspenders follow the chest.
 const waistRig:StyleGroups={};
 const webbing=make(hip);waistRig['field-webbing']=webbing;
 box(webbing,strapMaterial,4.35,.18,0,1.12,1.36,13.35);
 box(webbing,strapMaterial,-4.15,.18,0,1.06,1.34,12.20);
 for(const side of [-1,1])
  for(const x of [2.30,-.65,-3.60]){
   box(webbing,pouchMaterial,x,.10,side*7.20,2.69,3.66,2.36);
   // Field webbing/PLCE: broad cloth weather flap with one short
   // centrally placed retention strap, all textile swatches inherited.
   box(webbing,pouchMaterial,x+1.40,1.50,side*7.20,.36,1.07,2.61);
   box(webbing,strapMaterial,x+1.65,.75,side*7.20,.26,1.10,.65);
   // A clear, dark top opening shows where carried belt magazines sit.
   box(webbing,dark,x,1.88,side*8.42,2.02,.28,.19);
  }
 const battle=make(hip);waistRig['sadf-webbing']=battle;
 box(battle,strapMaterial,4.26,.13,0,1.18,1.50,13.55);
 box(battle,strapMaterial,-4.24,.13,0,1.10,1.48,12.55);
 for(const side of [-1,1]){
  for(const x of [2.1,-1.30]){
   // P83: large two-tier projecting cargo bag with a broad deep cap.
   box(battle,pouchMaterial,x,.16,side*7.32,3.25,4.38,2.84);
   box(battle,pouchMaterial,x+1.72,1.77,side*7.32,.42,1.05,3.06);
   box(battle,strapMaterial,x+2.02,.29,side*7.32,.28,1.30,.64);
  }
  box(battle,strapMaterial,-3.75,.12,side*5.4,1.16,4.15,5.15);
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
 const visual:WardrobeGearLayers={armor,rig,waistRig,belt,pack,pouchMaterial,strapMaterial,
  ensureArmor,ensureRig};
 visual.ensureAliceWaist=()=>{
  if(visual.aliceWaist)return;
  const alice=createAliceLc2Waist(hip,gearFabric,pouchMaterial,strapMaterial,trim);
  visual.aliceWaist=alice;waistRig['alice-lc2']=alice.root;
 };
 visual.ensureM1956Waist=()=>{
  if(visual.m1956Waist)return;
  const historic=createM1956Waist(hip,gearFabric,pouchMaterial,strapMaterial,trim);
  // The historically separate pouches/canteens are retained as individual
  // variant groups: bake within each one, not across hidden alternatives.
  for(const child of historic.root.children)
   if(child instanceof THREE.Group)bakeGearContactAO(child);
  bakeGearContactAO(historic.root);
  visual.m1956Waist=historic;waistRig['m1956-lce']=historic.root;
 };
 if(!lazyVariants){visual.ensureAliceWaist();visual.ensureM1956Waist();}
 return visual;
}
export function updateWardrobeGearLayers(v:WardrobeGearLayers,
 armor:string,rig:string,belt:string,pack:string,top='combat-shirt',
 aliceLoad:AliceLc2Load='standard',m1956Variant:M1956Variant='late'){
 v.ensureArmor?.(armor);v.ensureRig?.(rig);
 if(rig==='alice-lc2'){
  v.ensureAliceWaist?.();
  if(v.aliceWaist)updateAliceLc2Load(v.aliceWaist,aliceLoad);
 }
 if(rig==='m1956-lce'){
  v.ensureM1956Waist?.();
  if(v.m1956Waist)updateM1956Variant(v.m1956Waist,m1956Variant);
 }
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
   'field-webbing','sadf-webbing','m1956-lce','alice-lc2'].includes(rig))?
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
