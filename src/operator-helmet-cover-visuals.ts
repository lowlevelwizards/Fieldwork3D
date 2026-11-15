/** B1 M1 cover, band, net and scrim on one authored shell profile.
 * Each field option has three prebuilt contact variants: bare/fitted/loose.
 * Runtime only toggles groups and rebinds cached print textures.
 */
import * as THREE from 'three';
import {enableBakedGearAO,bakeGearGeometryAO} from './operator-baked-gear-ao.ts';
import {headwearCamoTexture} from './operator-headwear-materials.ts';
import {headwearCamoPlacement} from './operator-headwear-camo.ts';
import {OPERATOR_SOLID_FAMILIES} from './operator-solid-color-families.ts';
import {createM1ProfileGeometry} from './operator-m1-helmet-profile.ts';
import {M1_FIELD_MODES,createM1RetainingBandGeometry,
 createM1NetGeometry,createM1ScrimGeometry} from './operator-m1-field-geometry.ts';
import {resolvedM1FieldDress,type HelmetCoverConfig}
 from './operator-helmet-cover-policy.ts';
export type M1HelmetCoverLayers={
 fitted:THREE.Group;loose:THREE.Group;
 clothBand:THREE.Group;elasticBand:THREE.Group;net:THREE.Group;
 sparseScrim:THREE.Group;fieldScrim:THREE.Group;
 fabric:THREE.MeshStandardMaterial;support:THREE.MeshStandardMaterial;
 activePrint:string;
};
const hidden=(parent:THREE.Group,name:string)=>{
 const group=new THREE.Group();group.name=name;group.visible=false;parent.add(group);
 return group;
};
const mesh=(group:THREE.Group,g:THREE.BufferGeometry,m:THREE.Material,name:string)=>{
 bakeGearGeometryAO(g,m);
 const part=new THREE.Mesh(g,m);part.name=name;
 part.castShadow=false;part.receiveShadow=false;
 group.add(part);
};
const variants=(parent:THREE.Group,name:string,
 build:(mode:typeof M1_FIELD_MODES[number])=>THREE.BufferGeometry,
 material:THREE.Material)=>{
 const group=hidden(parent,name);
 for(const mode of M1_FIELD_MODES){
  const variant=new THREE.Group();variant.name='m1-'+mode;variant.visible=false;
  group.add(variant);mesh(variant,build(mode),material,name+'-'+mode);
 }
 return group;
};
const set=(group:THREE.Group,visible:boolean,mode:string)=>{
 group.visible=visible;
 for(const variant of group.children)variant.visible=variant.name==='m1-'+mode;
};
export function createM1HelmetCoverLayers(parent:THREE.Group):M1HelmetCoverLayers{
 const fabric=new THREE.MeshStandardMaterial({
  color:OPERATOR_SOLID_FAMILIES['olive-drab'],
  roughness:.98,metalness:0,flatShading:true,vertexColors:true,
  side:THREE.DoubleSide});
 const support=new THREE.MeshStandardMaterial({
  color:OPERATOR_SOLID_FAMILIES['olive-drab'],roughness:.96,metalness:0,
  side:THREE.DoubleSide});
 const elastic=new THREE.MeshStandardMaterial({
  color:OPERATOR_SOLID_FAMILIES.charcoal,roughness:.96,metalness:0,
  side:THREE.DoubleSide});
 const field=new THREE.MeshStandardMaterial({
  color:OPERATOR_SOLID_FAMILIES['forest-green'],roughness:1,
  side:THREE.DoubleSide});
 fabric.userData.fieldworkStudioHelmetShellCover=true;
 for(const m of [fabric,support,elastic,field]){
  m.userData.fieldworkStudioSoftGear=true;enableBakedGearAO(m);
 }
 const fitted=hidden(parent,'m1-fitted-cover');
 const loose=hidden(parent,'m1-loose-cover');
 mesh(fitted,createM1ProfileGeometry('fitted'),fabric,'B1-M1-fitted-profile');
 mesh(loose,createM1ProfileGeometry('loose'),fabric,'B1-M1-loose-profile');
 fitted.children[0].castShadow=true;loose.children[0].castShadow=true;
 const clothBand=variants(parent,'m1-cloth-band',createM1RetainingBandGeometry,support);
 const elasticBand=variants(parent,'m1-elastic-band',createM1RetainingBandGeometry,elastic);
 const net=variants(parent,'m1-coarse-net',createM1NetGeometry,support);
 const sparseScrim=variants(parent,'m1-sparse-scrim',
  mode=>createM1ScrimGeometry(mode,false),field);
 const fieldScrim=variants(parent,'m1-field-scrim',
  mode=>createM1ScrimGeometry(mode,true),field);
 return {fitted,loose,clothBand,elasticBand,net,sparseScrim,fieldScrim,
  fabric,support,activePrint:''};
}
export function updateM1HelmetCoverLayers(
 v:M1HelmetCoverLayers,raw:HelmetCoverConfig|undefined,
 operatorId:string,roll=0){
 const c=resolvedM1FieldDress(raw);
 const mode=c.helmetCover==='fitted'?'fitted':
  c.helmetCover==='loose'?'loose':'steel';
 v.fitted.visible=mode==='fitted';v.loose.visible=mode==='loose';
 set(v.clothBand,c.helmetBand==='cloth',mode);
 set(v.elasticBand,c.helmetBand==='elastic',mode);
 set(v.net,c.helmetNet==='coarse',mode);
 set(v.sparseScrim,c.helmetScrim==='sparse',mode);
 set(v.fieldScrim,c.helmetScrim==='field',mode);
 const print=mode!=='steel'?c.helmetCoverCamo:undefined;
 const map=print?headwearCamoTexture('m1-steel',print,
  headwearCamoPlacement(operatorId,'m1-cover',print,roll)):null;
 if(v.fabric.map!==map){v.fabric.map=map;v.fabric.needsUpdate=true;}
 v.fabric.color.setHex(print?0xffffff:OPERATOR_SOLID_FAMILIES['olive-drab']);
 v.activePrint=print??'';
}
