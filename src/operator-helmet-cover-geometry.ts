/** H1-C: independent fabric on real shell volume contours.
 * Covers share the exact cuboid silhouette's ear/nape profile; no blanket
 * uniform scaling and no per-pose allocations.
 */
import * as THREE from 'three';
import {unionCuboids,type HeadwearCuboid} from './operator-cuboid-union.ts';
import {headwearCuboidVolumes,type HeadSilhouetteId} from './operator-headwear-silhouettes.ts';
import {HELMET_MOUNT_PROFILES} from './operator-helmet-attachment-frames.ts';
import {isH1ModernHelmet,type HelmetSetupV1} from './operator-helmet-setup-policy.ts';
import {headwearCamoTexture} from './operator-headwear-materials.ts';
import {headwearCamoPlacement,type HeadwearCamoId} from './operator-headwear-camo.ts';
import {enableBakedGearAO,bakeGearGeometryAO} from './operator-baked-gear-ao.ts';
import {OPERATOR_SOLID_FAMILIES} from './operator-solid-color-families.ts';
export type ModernHelmetCoverLayers={
 fitted:THREE.Group;loose:THREE.Group;band:THREE.Group;
 net:THREE.Group;sparse:THREE.Group;field:THREE.Group;
 fabric:THREE.MeshStandardMaterial;activePrint:string;
};
const part=(name:string,x:number,y:number,z:number,width:number,height:number,depth:number):
 HeadwearCuboid=>({name,x,y,z,width,height,depth});
const hidden=(parent:THREE.Group)=>{const g=new THREE.Group();g.visible=false;parent.add(g);return g;};
const meshed=(group:THREE.Group,parts:readonly HeadwearCuboid[],
 material:THREE.Material,label:string)=>{
 const geo=unionCuboids(parts,{faceTone:()=>1,faceRegion:(p,axis,sign)=>
  axis===1&&sign===1?3:0});
 bakeGearGeometryAO(geo,material);
 const m=new THREE.Mesh(geo,material);m.name=label;m.castShadow=true;
 group.add(m);
};
export function modernHelmetCoverVolumes(shell:string,loose=false):readonly HeadwearCuboid[]{
 if(!isH1ModernHelmet(shell))return [];
 const delta=loose?.25:.13;
 // Expand each of the source's real protective masses, keeping its original
 // lower edge. This preserves distinct high-/mid-/full-cut negative space.
 return headwearCuboidVolumes(shell as HeadSilhouetteId).map(p=>({
  ...p,name:'cloth-'+p.name,
  x:p.x+Math.sign(p.x)*delta*.12,z:p.z+Math.sign(p.z)*delta*.12,
  y:p.y+delta/2,width:p.width+delta*2,
  height:p.height+delta,depth:p.depth+delta*2
 }));
}
export function createModernHelmetCoverLayers(parent:THREE.Group,shell:string):
 ModernHelmetCoverLayers{
 if(!isH1ModernHelmet(shell))throw Error('unsupported textile shell '+shell);
 const p=HELMET_MOUNT_PROFILES[shell],side=p.side;
 const fabric=new THREE.MeshStandardMaterial({
  color:OPERATOR_SOLID_FAMILIES['olive-drab'],roughness:.98,
  metalness:0,flatShading:true,vertexColors:true
 });
 const binding=new THREE.MeshStandardMaterial({
  color:OPERATOR_SOLID_FAMILIES.charcoal,roughness:.98,flatShading:true,vertexColors:true
 });
 const scrimMaterial=new THREE.MeshStandardMaterial({
  color:OPERATOR_SOLID_FAMILIES['forest-green'],roughness:1,flatShading:true,vertexColors:true
 });
 for(const m of [fabric,binding,scrimMaterial])enableBakedGearAO(m);
 const fitted=hidden(parent),loose=hidden(parent),band=hidden(parent),
  net=hidden(parent),sparse=hidden(parent),field=hidden(parent);
 meshed(fitted,modernHelmetCoverVolumes(shell),fabric,'H1-fitted-cloth');
 meshed(loose,modernHelmetCoverVolumes(shell,true),fabric,'H1-loose-cloth');
 // Segmented retention band: no solid strip across the open ear interval.
 const fore=p.front-.20,rear=p.rear+.20;
 meshed(band,[
  part('band-front',0,p.ear+.48,fore,side*2+.28,.66,.40),
  part('band-rear',0,p.ear+.48,rear,side*2+.28,.66,.40)
 ],binding,'H1-retaining-band');
 const crown=p.top+.11,depth=(p.rear-p.front)*.82;
 meshed(net,[
  ...[-2.7,0,2.7].map(x=>part('net-vertical',x,crown,0,.30,.20,depth)),
  ...[-2.7,2.7].map(z=>part('net-crossing',0,crown+.04,z,side*2,.20,.30))
 ],binding,'H1-coarse-net');
 const pieces=[
  part('scrim-front-left',-side-.18,p.ear+1.18,p.front+2,1.35,1.55,.8),
  part('scrim-back-right',side+.20,p.ear+1.38,p.rear-1.9,1.4,2.10,.8),
  part('scrim-back',2.7,p.top-.7,rear,.95,1.80,.78)
 ];
 meshed(sparse,pieces.slice(0,2),scrimMaterial,'H1-sparse-scrim');
 meshed(field,pieces,scrimMaterial,'H1-field-scrim');
 return {fitted,loose,band,net,sparse,field,fabric,activePrint:''};
}
export function updateModernHelmetCoverLayers(v:ModernHelmetCoverLayers,shell:string,
 setup:HelmetSetupV1,camo:HeadwearCamoId|undefined,operatorId:string,roll=0):void{
 v.fitted.visible=setup.cover==='fitted';
 v.loose.visible=setup.cover==='loose';
 const active=setup.cover!=='none';
 v.band.visible=active&&setup.band==='elastic';
 v.net.visible=active&&setup.scrim==='net';
 v.sparse.visible=active&&setup.scrim==='sparse';
 v.field.visible=active&&setup.scrim==='field';
 const print=active&&camo?camo:undefined;
 const map=print&&isH1ModernHelmet(shell)?headwearCamoTexture(
  shell,print,headwearCamoPlacement(operatorId,'helmet-cover',print,roll)):null;
 if(v.fabric.map!==map){v.fabric.map=map;v.fabric.needsUpdate=true;}
 v.fabric.color.setHex(print?0xffffff:OPERATOR_SOLID_FAMILIES['olive-drab']);
 v.activePrint=print??'';
}
