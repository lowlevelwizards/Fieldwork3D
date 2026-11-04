/** Procedural wardrobe accessories. Cosmetics only: no anatomy, hitboxes,
 * vision cones, weapon contacts, sound or protection stats are changed.
 * One group per model family, toggled at pose time and never reallocated.
 */
import * as THREE from 'three';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import {createHeadwearSilhouette} from './operator-headwear-silhouettes.ts';
import {createD2Balaclava} from './operator-d2-fabric-visuals.ts';
import {createHeadwearDetailMaterial} from './operator-headwear-materials.ts';
import type {HeadSilhouetteId} from './operator-headwear-silhouettes.ts';
import type {WardrobeSlot} from './operator-wardrobe-data.ts';
type Model=Record<string,THREE.Group>;
export type WardrobeHeadLayers={
 headwear:Model;facewear:Model;eyewear:Model;headset:Model;
 headwearMaterials:Record<string,THREE.MeshStandardMaterial>;
};
const cube=(g:THREE.Group,m:THREE.Material,
 x:number,y:number,z:number,w:number,h:number,d:number)=>{
 const mesh=new THREE.Mesh(mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d),m);
 mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
 g.add(mesh);return mesh;
};
const group=(parent:THREE.Group)=>{const g=new THREE.Group();parent.add(g);return g;};
export function createWardrobeHeadLayers(head:THREE.Group,
 canonicalHead:THREE.Group,cloth:THREE.Material,
 vest:THREE.Material,dark:THREE.Material,skin:THREE.Material):WardrobeHeadLayers{
 const headwear:Model={},facewear:Model={},eyewear:Model={},headset:Model={};
 // Each approved silhouette keeps its geometry, but now owns a neutral
 // recolorable material. Material detail never produces coplanar geometry.
 const headwearMaterials:Record<string,THREE.MeshStandardMaterial>={};
 const detail=(id:HeadSilhouetteId,key:string=id)=>{
  const material=createHeadwearDetailMaterial(id);
  headwearMaterials[key]=material;
  return material;
 };
 const g=(set:Model,id:string,canonical=false)=>{
  const model=group(canonical?canonicalHead:head);
  model.visible=false;set[id]=model;return model;
 };
 const brimCap=(id:string,backward=false,soft=false)=>{
  const cap=g(headwear,id);
  cube(cap,cloth,-.5,6.66,0,8.45,1.65,8.35);
  cube(cap,soft?vest:cloth,-.9,7.55,0,7.05,.45,7.4);
  cube(cap,cloth,backward?-4.5:4.5,5.95,0,4.0,.45,7.7);
  return cap;
 };
 brimCap('baseball-cap');
 brimCap('backwards-cap',true);
 // Stage 1 silhouette prototypes live in -Z forward head space.
 g(headwear,'patrol-cap',true).add(createHeadwearSilhouette('patrol-cap',detail('patrol-cap')));
 brimCap('field-cap',false,true);
 // Stage 1G–1J: these already exist in the wardrobe catalog. Replace
 // their older multi-cube placeholders with the same canonical, unified
 // silhouette system as the approved ACH and high-cut.
 for(const id of ['boonie','beanie','pasgt','soviet-steel'] as const)
  g(headwear,id,true).add(createHeadwearSilhouette(id,detail(id)));
 const helmet=(id:string,size:number,cut:number,rail:boolean)=>{
  const model=g(headwear,id);
  cube(model,vest,-.5,6.85,0,size,2.45,size);
  cube(model,vest,-1.0,8.2,0,size-1.3,.3,size-1.1);
  cube(model,dark,3.85,5.9,0,.55,.7,size-.2);
  for(const side of [-1,1]){
   if(cut<2)cube(model,vest,-2.4,4.45,side*(size/2-.15),3.7,2.6,.78);
   if(rail)cube(model,dark,-1.1,6.0,side*(size/2+.22),4.1,.55,.35);
  }
  if(rail)cube(model,dark,2.0,8.52,0,1.4,.4,2.0);
 };
 g(headwear,'ach',true).add(createHeadwearSilhouette('ach',detail('ach')));
 g(headwear,'high-cut',true).add(createHeadwearSilhouette('high-cut',detail('high-cut')));
 // Existing saved rail layouts keep the correct base shell, with actual
 // rails explicitly deferred to the approved detailing phase.
 g(headwear,'high-cut-rails',true).add(createHeadwearSilhouette('high-cut',detail('high-cut','high-cut-rails')));
 helmet('skate-helmet',9.65,2,false);
 helmet('bump-helmet',9.1,2,true);
 // D2-A1: fitted canonical -Z fabric shells with real skin-revealing apertures.
 for(const id of ['balaclava-one','balaclava-three','balaclava-open'] as const){
  const model=g(facewear,id,true);
  model.add(createD2Balaclava(id,cloth));
 }
 const neck=(id:string,high:number)=>{
  const model=g(facewear,id);
  cube(model,cloth,1.75,-1.8,0,5.75,2.6+high,8.9);
 };
 neck('gaiter',.9);neck('shemagh',2.1);neck('scarf',.65);
 const halfMask=g(facewear,'half-mask');
 cube(halfMask,vest,4.55,1.55,0,1.0,2.3,6.5);
 const gasMask=g(facewear,'gas-mask');
 cube(gasMask,vest,4.55,2.2,0,1.15,4.5,7.6);
 cube(gasMask,dark,5.35,1.45,0,1.9,2.05,2.5);
 for(const sign of [-1,1])cube(gasMask,dark,5.28,4.1,sign*2.15,.45,1.0,1.75);
 const eye=(id:string,raised=false,darkLens=false,goggles=false)=>{
  const model=g(eyewear,id),y=raised?6.35:3.85;
  const rim=goggles?vest:dark;
  for(const sign of [-1,1]){
   cube(model,rim,4.45,y,sign*2.05,.45,goggles?1.45:.77,3.2);
   cube(model,darkLens?dark:skin,4.7,y,sign*2.05,.19,goggles?1.05:.48,2.65);
  }
  cube(model,rim,4.48,y,0,.48,.39,1.5);
  for(const sign of [-1,1])
   cube(model,dark,-.3,y+.1,sign*4.15,8.0,.34,.35);
 };
 eye('clear-glasses');
 eye('safety-glasses',false,false,true);
 eye('sunglasses',false,true);
 eye('goggles-down',false,true,true);
 eye('goggles-up',true,true,true);
 const ear=(id:string,microphone=false,large=false)=>{
  const model=g(headset,id);
  for(const side of [-1,1])
   cube(model,dark,-1.55,3.45,side*4.75,2.5,large?3.3:2.25,.95);
  cube(model,vest,-1.0,6.1,0,3.4,.6,9.3);
  if(microphone){
   cube(model,dark,1.7,2.1,4.85,4.6,.34,.42);
   cube(model,vest,4.02,2.1,4.65,.7,.75,1.05);
  }
 };
 ear('over-ear',false,true);
 ear('boom-headset',true,true);
 ear('helmet-ears',false,false);
 const earpiece=g(headset,'earpiece');
 cube(earpiece,dark,-1.8,3.55,4.5,1.1,1.7,.85);
 // Consolidate only static meshes; hidden families still incur no draw calls.
 for(const set of [headwear,facewear,eyewear,headset])
  for(const model of Object.values(set))consolidateVisualGroup(model);
 return {headwear,facewear,eyewear,headset,headwearMaterials};
}
export function updateWardrobeHeadLayers(layers:WardrobeHeadLayers,
 headwear:string,facewear:string,eyewear:string,headset:string){
 const choices:{slot:WardrobeSlot;map:Model;id:string}[]=[
  {slot:'headwear',map:layers.headwear,id:headwear},
  {slot:'facewear',map:layers.facewear,id:facewear},
  {slot:'eyewear',map:layers.eyewear,id:eyewear},
  {slot:'headset',map:layers.headset,id:headset}
 ];
 for(const {map,id} of choices)
  for(const [style,model] of Object.entries(map))model.visible=style===id;
}
