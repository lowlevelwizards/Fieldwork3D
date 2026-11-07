/** Procedural wardrobe accessories. Cosmetics only: no anatomy, hitboxes,
 * vision cones, weapon contacts, sound or protection stats are changed.
 * One group per model family, toggled at pose time and never reallocated.
 */
import * as THREE from 'three';
import {createPoliceVisor,updatePoliceVisor,type PoliceVisorLayers} from './operator-police-visor-visuals.ts';
import {policeVisorFit,type PoliceVisorOptions} from './operator-police-visor-policy.ts';
import {createM56Extras,updateM56Extras,type M56Extras} from './operator-ddr-m56-visuals.ts';
import type {M56Options} from './operator-ddr-m56-policy.ts';
import {createM1HelmetCoverLayers,updateM1HelmetCoverLayers,
 type M1HelmetCoverLayers} from './operator-helmet-cover-visuals.ts';
import type {HelmetCoverConfig} from './operator-helmet-cover-policy.ts';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';
import {bakeGearGeometryAO} from './operator-baked-gear-ao.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import {createHeadwearSilhouette} from './operator-headwear-silhouettes.ts';
import {createD2Balaclava} from './operator-d2-fabric-visuals.ts';
import {createD2FabricWrap} from './operator-d2-fabric-wraps.ts';
import {createD2Glasses} from './operator-d2-eyewear-visuals.ts';
import {createD2Goggles} from './operator-d2-goggle-visuals.ts';
import {fittedEyeOffset} from './operator-d2-eyewear-fit.ts';
import {createD2Mask} from './operator-d2-mask-visuals.ts';
import {D2_FACE_SOLID_COLORS,D2_FRAME_COLORS,D2_LENS_MATERIALS,D2_MASK_COLORS,
 resolveD2HeadAssembly,type D2FaceSolid,type D2AccessoryOptions,type D2MaskSolid} from './operator-head-accessory-catalog.ts';
import {createHeadwearDetailMaterial} from './operator-headwear-materials.ts';
import type {HeadSilhouetteId} from './operator-headwear-silhouettes.ts';
import type {WardrobeSlot} from './operator-wardrobe-data.ts';
type Model=Record<string,THREE.Group>;
export type WardrobeHeadLayers={
 headwear:Model;facewear:Model;eyewear:Model;headset:Model;
 headwearMaterials:Record<string,THREE.MeshStandardMaterial>;
 faceFabric:THREE.MeshStandardMaterial;
 faceFabricDefaultHex:number;
 eyewearFrame:THREE.MeshStandardMaterial;
 eyewearLens:THREE.MeshStandardMaterial;
 eyewearStrap:THREE.MeshStandardMaterial;
 maskRubber:THREE.MeshStandardMaterial;
 /** Deferred only in battlefield rigs; Studio and Labs remain eager. */
 deferredEyewear:Record<string,()=>void>;
 deferredHeadwear:Record<string,()=>void>;
 deferredFacewear:Record<string,()=>void>;
 deferredHeadset:Record<string,()=>void>;
 twoHoleMouthCover?:THREE.Group;
 m1Cover?:M1HelmetCoverLayers;
 m56Extras?:M56Extras;
 policeVisor?:PoliceVisorLayers;
};
const cube=(g:THREE.Group,m:THREE.Material,
 x:number,y:number,z:number,w:number,h:number,d:number)=>{
 const geometry=mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d);
 bakeGearGeometryAO(geometry,m);
 const mesh=new THREE.Mesh(geometry,m);
 mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
 g.add(mesh);return mesh;
};
const group=(parent:THREE.Group)=>{const g=new THREE.Group();parent.add(g);return g;};
export function createWardrobeHeadLayers(head:THREE.Group,
 canonicalHead:THREE.Group,cloth:THREE.Material,
 vest:THREE.Material,dark:THREE.Material,_skin:THREE.Material,
 lazyAccessories=false):WardrobeHeadLayers{
 const headwear:Model={},facewear:Model={},eyewear:Model={},headset:Model={};
 const deferredHeadwear:Record<string,()=>void>={};
 const deferredFacewear:Record<string,()=>void>={};
 const deferredHeadset:Record<string,()=>void>={};
 let layersRef:WardrobeHeadLayers|null=null;
 let m1Cover:M1HelmetCoverLayers|undefined;
 let m56Extras:M56Extras|undefined;
 let policeVisor:PoliceVisorLayers|undefined;
 // A dedicated face textile material ensures color edits never recolor helmets,
 // uniform sleeves, straps or unrelated body pieces.
 const faceFabric=cloth instanceof THREE.MeshStandardMaterial?
  cloth.clone():new THREE.MeshStandardMaterial({color:0x515b50,roughness:1});
 const faceFabricDefaultHex=faceFabric.color.getHex();
 const eyewearFrame=new THREE.MeshStandardMaterial({color:0x24282b,
  roughness:.68,metalness:.03,flatShading:true});
 const eyewearLens=new THREE.MeshStandardMaterial({
  color:D2_LENS_MATERIALS.clear.hex,
  opacity:D2_LENS_MATERIALS.clear.opacity,transparent:true,depthWrite:false,
  roughness:.25,metalness:.05,side:THREE.DoubleSide});
 const eyewearStrap=new THREE.MeshStandardMaterial({color:0x323936,
  roughness:.90,flatShading:true});
 const maskRubber=new THREE.MeshStandardMaterial({color:0x2b302e,
  roughness:.93,flatShading:true});
 const maskHardware=new THREE.MeshStandardMaterial({color:0x242c2b,
  roughness:.74,flatShading:true});
 const maskFilters=new THREE.MeshStandardMaterial({color:0x61685f,
  roughness:.84,flatShading:true});
 const maskLens=new THREE.MeshStandardMaterial({color:0x526760,
  transparent:false,opacity:1,depthWrite:true,roughness:.63,
  flatShading:true,side:THREE.DoubleSide});
 const maskMaterials={rubber:maskRubber,hardware:maskHardware,
  filters:maskFilters,lens:maskLens};
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
 const defer=(registry:Record<string,()=>void>,id:string,model:THREE.Group,
  build:()=>void)=>{
  if(lazyAccessories)registry[id]=()=>{
   build();consolidateVisualGroup(model);delete registry[id];
  };
  else build();
 };
 const headModel=(id:string,canonical:boolean,build:(model:THREE.Group)=>void)=>{
  const model=g(headwear,id,canonical);
  defer(deferredHeadwear,id,model,()=>build(model));
  return model;
 };
 const brimCap=(id:string,backward=false,soft=false)=>{
  headModel(id,false,cap=>{
   cube(cap,cloth,-.5,6.66,0,8.45,1.65,8.35);
   cube(cap,soft?vest:cloth,-.9,7.55,0,7.05,.45,7.4);
   cube(cap,cloth,backward?-4.5:4.5,5.95,0,4.0,.45,7.7);
  });
 };
 brimCap('baseball-cap');
 brimCap('backwards-cap',true);
 // Stage 1 silhouette prototypes live in -Z forward head space.
 headModel('patrol-cap',true,cap=>cap.add(
  createHeadwearSilhouette('patrol-cap',detail('patrol-cap'))));
 headModel('beret',true,cap=>cap.add(createHeadwearSilhouette('beret',detail('beret'))));
 brimCap('field-cap',false,true);
 // Stage 1G–1J: these already exist in the wardrobe catalog. Replace
 // their older multi-cube placeholders with the same canonical, unified
 // silhouette system as the approved ACH and high-cut.
 for(const id of ['boonie','beanie','pasgt','soviet-steel'] as const)
  headModel(id,true,cap=>cap.add(createHeadwearSilhouette(id,detail(id))));
 headModel('police-helmet',true,model=>{
  model.add(createHeadwearSilhouette('police-helmet',detail('police-helmet')));
  policeVisor=createPoliceVisor(model);
  if(layersRef)layersRef.policeVisor=policeVisor;
 });
 headModel('ddr-m56',true,model=>{
  model.add(createHeadwearSilhouette('ddr-m56',detail('ddr-m56')));
  m56Extras=createM56Extras(model,dark);
  if(layersRef)layersRef.m56Extras=m56Extras;
 });
 headModel('m1-steel',true,model=>{
  model.add(createHeadwearSilhouette('m1-steel',detail('m1-steel')));
  m1Cover=createM1HelmetCoverLayers(model);
  if(layersRef)layersRef.m1Cover=m1Cover;
 });
 const helmet=(id:string,size:number,cut:number,rail:boolean)=>{
  headModel(id,false,model=>{
   cube(model,vest,-.5,6.85,0,size,2.45,size);
   cube(model,vest,-1.0,8.2,0,size-1.3,.3,size-1.1);
   cube(model,dark,3.85,5.9,0,.55,.7,size-.2);
   for(const side of [-1,1]){
    if(cut<2)cube(model,vest,-2.4,4.45,side*(size/2-.15),3.7,2.6,.78);
    if(rail)cube(model,dark,-1.1,6.0,side*(size/2+.22),4.1,.55,.35);
   }
   if(rail)cube(model,dark,2.0,8.52,0,1.4,.4,2.0);
  });
 };
 headModel('ach',true,model=>model.add(createHeadwearSilhouette('ach',detail('ach'))));
 headModel('high-cut',true,model=>model.add(
  createHeadwearSilhouette('high-cut',detail('high-cut'))));
 // Rails inherit the approved shell without inventing a new silhouette.
 headModel('high-cut-rails',true,model=>model.add(
  createHeadwearSilhouette('high-cut',detail('high-cut','high-cut-rails'))));
 for(const id of ['mich-2001','mich-2002','fast-sf','fast-xp-mid'] as const)
  headModel(id,true,model=>model.add(createHeadwearSilhouette(id,detail(id))));
 helmet('skate-helmet',9.65,2,false);
 helmet('bump-helmet',9.1,2,true);
 // D2-A1: fitted canonical -Z fabric shells with real skin-revealing apertures.
 let twoHoleMouthCover:THREE.Group|undefined;
 for(const id of ['balaclava-one','balaclava-three','balaclava-open'] as const){
  const model=g(facewear,id,true);
  defer(deferredFacewear,id,model,()=>{
   const fabricModel=createD2Balaclava(id,faceFabric);
   model.add(fabricModel);
   if(id==='balaclava-three'){
    twoHoleMouthCover=fabricModel.getObjectByName('d2-two-hole-mouth-cover') as THREE.Group;
    if(layersRef)layersRef.twoHoleMouthCover=twoHoleMouthCover;
   }
  });
 }
 // D2-A2: one model per wrap family, with physically distinct prebuilt modes.
 for(const id of ['gaiter','shemagh','bandana'] as const){
  const model=g(facewear,id,true);
  defer(deferredFacewear,id,model,()=>model.add(createD2FabricWrap(id,faceFabric)));
 }
 // The retired scarf ID is migrated in readWardrobe; never show a duplicate.
 // D2-C1: replace the old flat lower-face placeholder with two real shells.
 for(const id of ['half-mask','respirator-half','gas-gp5','gas-m17',
                  'gas-m40','gas-m50'] as const){
  const model=g(facewear,id,true);
  defer(deferredFacewear,id,model,()=>model.add(createD2Mask(id,maskMaterials)));
 }
 // All seven eyewear families were previously built for every soldier,
 // including bare-eyed soldiers and enemies nobody has ever observed.
 // Battlefield actors defer those solid housings until actually equipped;
 // Studio, Lab and default callers keep fully eager previews.
 const deferredEyewear:Record<string,()=>void>={};
 const addEyewear=(id:string,build:()=>THREE.Group)=>{
  const model=g(eyewear,id,true);
  if(lazyAccessories)deferredEyewear[id]=()=>{
   model.add(build());delete deferredEyewear[id];
  };
  else model.add(build());
 };
 for(const id of ['glasses-standard','glasses-aviator',
                   'glasses-wrap','glasses-shield'] as const)
  addEyewear(id,()=>createD2Glasses(id,eyewearFrame,eyewearLens));
 for(const id of ['goggles-low','goggles-field','goggles-retro'] as const)
  addEyewear(id,()=>createD2Goggles(id,eyewearFrame,eyewearLens,eyewearStrap));
 const ear=(id:string,microphone=false,large=false)=>{
  const model=g(headset,id);
  defer(deferredHeadset,id,model,()=>{
   for(const side of [-1,1])
    cube(model,dark,-1.55,3.45,side*4.75,2.5,large?3.3:2.25,.95);
   cube(model,vest,-1.0,6.1,0,3.4,.6,9.3);
   if(microphone){
    cube(model,dark,1.7,2.1,4.85,4.6,.34,.42);
    cube(model,vest,4.02,2.1,4.65,.7,.75,1.05);
   }
  });
 };
 ear('over-ear',false,true);
 ear('boom-headset',true,true);
 ear('helmet-ears',false,false);
 const earpiece=g(headset,'earpiece');
 defer(deferredHeadset,'earpiece',earpiece,()=>
  cube(earpiece,dark,-1.8,3.55,4.5,1.1,1.7,.85));
 // Consolidate only static meshes; hidden families still incur no draw calls.
 for(const set of [headwear,facewear,eyewear,headset])
  for(const model of Object.values(set))consolidateVisualGroup(model);
 const layers:WardrobeHeadLayers={headwear,facewear,eyewear,headset,headwearMaterials,
  faceFabric,faceFabricDefaultHex,eyewearFrame,eyewearLens,
  eyewearStrap,maskRubber,deferredEyewear,deferredHeadwear,
  deferredFacewear,deferredHeadset,twoHoleMouthCover,m1Cover,m56Extras,policeVisor};
 layersRef=layers;return layers;
}
export function updateWardrobeHeadLayers(layers:WardrobeHeadLayers,
 headwear:string,facewear:string,eyewear:string,headset:string,
 d2FaceMode?:string,faceSolid?:D2FaceSolid,d2Eye?:D2AccessoryOptions,
 maskColor?:D2MaskSolid,beretDrape:'left'|'right'='right',
 helmetCover?:HelmetCoverConfig&M56Options&PoliceVisorOptions,camoIdentity='',coverRoll=0){
 // Update the already allocated material; do not recreate meshes or geometry.
 layers.faceFabric.color.setHex(faceSolid?
  D2_FACE_SOLID_COLORS[faceSolid].hex:layers.faceFabricDefaultHex);
 layers.maskRubber.color.setHex(D2_MASK_COLORS[maskColor??'black'].hex);
 const frame=D2_FRAME_COLORS[d2Eye?.eyeFrame??'black'];
 const tint=D2_LENS_MATERIALS[d2Eye?.eyeTint??'clear'];
 layers.eyewearFrame.color.setHex(frame.hex);
 layers.eyewearLens.color.setHex(tint.hex);
 layers.eyewearLens.opacity=tint.opacity;
 // Only the lens material makes the glass visible; no generic glint mesh.
 layers.eyewearLens.metalness=d2Eye?.eyeTint==='mirrored'?.48:.04;
 layers.eyewearLens.roughness=d2Eye?.eyeTint==='mirrored'?.33:.68;
 const assembly=resolveD2HeadAssembly({facewear,eyewear,headwear,headset,
  options:d2Eye});
 // The beret's asymmetrical crown remains one approved model, mirrored at
 // the whole-shape level. No mirrored badge glyph or spare geometry.
 const beret=layers.headwear.beret;
 if(beret)beret.scale.x=beretDrape==='left'?-1:1;
 // Only the worn accessories are built on battlefield rigs. Studio and
 // operator labs remain eager; switching a style builds it just once.
 layers.deferredHeadwear[assembly.headwear]?.();
 if(layers.m1Cover)updateM1HelmetCoverLayers(layers.m1Cover,
  assembly.headwear==='m1-steel'?helmetCover:undefined,camoIdentity,coverRoll);
 if(layers.m56Extras)updateM56Extras(layers.m56Extras,
  assembly.headwear==='ddr-m56'?helmetCover:undefined);
 if(layers.policeVisor)updatePoliceVisor(layers.policeVisor,
  helmetCover,assembly.headwear,
  policeVisorFit(assembly.headwear,facewear,assembly.eyewear,assembly.headset));
 layers.deferredFacewear[facewear]?.();
 layers.deferredHeadset[assembly.headset]?.();
 layers.deferredEyewear[assembly.eyewear]?.();
 const choices:{slot:WardrobeSlot;map:Model;id:string}[]=[
  {slot:'headwear',map:layers.headwear,id:assembly.headwear},
  {slot:'facewear',map:layers.facewear,id:facewear},
  {slot:'eyewear',map:layers.eyewear,id:assembly.eyewear},
  {slot:'headset',map:layers.headset,id:assembly.headset}
 ];
 for(const {map,id} of choices)
  for(const [style,model] of Object.entries(map))model.visible=style===id;
 // A persistent option of the same balaclava, never a separate wardrobe card.
 if(layers.twoHoleMouthCover)
  layers.twoHoleMouthCover.visible=facewear==='balaclava-three'&&d2FaceMode==='two-hole';
 const standard=layers.eyewear['glasses-standard']?.children.find(x=>x.userData.modelAxes);
 if(standard){
  const wanted=d2Eye?.eyeMode??'rectangular';
  for(const shape of standard.children)
   shape.visible=shape.userData.d2EyeVariant===wanted;
 }
 // Fit the actual selected eyewear below the current headwear brow.
 // Geometry, materials, pose children and saved styles remain unchanged.
 const selectedEye=layers.eyewear[assembly.eyewear]?.children.find(
  child=>child.userData.modelAxes);
 if(selectedEye){
  const fit=fittedEyeOffset(assembly.headwear,
   Number(selectedEye.userData.d2EyeFitTop)||4.78,assembly.eyewear);
  if(assembly.eyewear.startsWith('goggles-')){
   selectedEye.position.set(0,0,0);
   for(const pose of selectedEye.children){
    const base=pose.userData.d2DefaultPosition as THREE.Vector3|undefined;
    if(!base)continue;
    pose.position.copy(base);
    if(pose.userData.d2GogglePlacement==='eyes'){
     pose.position.y+=fit.y;
     pose.position.z+=fit.z;
    }
   }
  }else selectedEye.position.set(0,fit.y,fit.z);
 }
 // Variant meshes stay allocated and mutually exclusive while the mask changes.
 for(const id of ['half-mask','respirator-half'] as const){
  const model=layers.facewear[id]?.children.find(x=>x.userData.modelAxes);
  if(!model)continue;
  const defaultMode=id==='half-mask'?'solid':'twin-filter';
  const valid=id==='half-mask'?['solid','mesh']:['twin-filter','compact-filter'];
  const mode=facewear===id&&d2FaceMode&&valid.includes(d2FaceMode)?
   d2FaceMode:defaultMode;
  for(const state of model.children)
   state.visible=state.userData.d2MaskMode===mode;
 }
 for(const id of ['goggles-low','goggles-field','goggles-retro'] as const){
  const model=layers.eyewear[id]?.children.find(x=>x.userData.modelAxes);
  if(!model)continue;
  for(const pose of model.children)
   pose.visible=pose.userData.d2GogglePlacement===assembly.eyewearPlacement;
 }
 // Only one wear state of each wrap is visible. Inactive models stay hidden.
 for(const id of ['gaiter','shemagh','bandana'] as const){
  const wrap=layers.facewear[id]?.children.find(child=>child.userData.modelAxes);
  if(!wrap)continue;
  const fallback=id==='gaiter'?'nose':id==='shemagh'?'draped':'raised';
  const supported=id==='gaiter'?['lowered','mouth','nose']:
   id==='shemagh'?['draped','face-wrap','head-wrap']:['raised','lowered'];
  const desired=facewear===id&&d2FaceMode&&supported.includes(d2FaceMode)?
   d2FaceMode:fallback;
  for(const state of wrap.children)
   state.visible=state.userData.d2WrapMode===desired;
 }
}
