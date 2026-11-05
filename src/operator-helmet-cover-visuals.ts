/** R5E: shape-aware fabric on the M1 bowl, with the metal rolled rim exposed.
 * +Y is up, -Z is front and +X is operator right. All pieces are static,
 * exterior-only cuboid unions; pose changes toggle groups, not rebuild them.
 */
import * as THREE from 'three';
import {unionCuboids,type HeadwearCuboid} from './operator-cuboid-union.ts';
import {enableBakedGearAO,bakeGearGeometryAO} from './operator-baked-gear-ao.ts';
import {headwearCamoTexture} from './operator-headwear-materials.ts';
import {headwearCamoPlacement} from './operator-headwear-camo.ts';
import {OPERATOR_SOLID_FAMILIES} from './operator-solid-color-families.ts';
import {resolvedHelmetCoverConfig,type HelmetCoverConfig}
 from './operator-helmet-cover-policy.ts';

export type M1HelmetCoverLayers={
 fitted:THREE.Group;loose:THREE.Group;
 clothBand:THREE.Group;elasticBand:THREE.Group;net:THREE.Group;
 sparseScrim:THREE.Group;fieldScrim:THREE.Group;
 fabric:THREE.MeshStandardMaterial;support:THREE.MeshStandardMaterial;
 activePrint:string;
};
type Piece=HeadwearCuboid;
const mesh=(g:THREE.Group,parts:readonly Piece[],m:THREE.Material,name:string)=>{
 const geometry=unionCuboids(parts,{faceTone:()=>1,faceRegion:(part,axis,sign)=>
  part.name.includes('crown')&&axis===1&&sign===1?3:0});
 bakeGearGeometryAO(geometry,m);
 const result=new THREE.Mesh(geometry,m);result.name=name;
 result.castShadow=true;result.receiveShadow=false;g.add(result);
 return result;
};
const part=(name:string,x:number,y:number,z:number,w:number,h:number,d:number):Piece=>
 ({name,x,y,z,width:w,height:h,depth:d});
function coverBody(loose:boolean):readonly Piece[]{
 const shift=loose?.34:0,extra=loose?.26:0;
 const x=5.05+shift,z=5.02+shift;
 return [
  part('cover-crown',0,7.92,0,10.10+2*shift,1.98+extra,10.95+2*shift),
  part('cover-front',0,6.35,-z,11.16+2*shift,2.93+extra,1.24),
  part('cover-rear',0,6.35,z,11.16+2*shift,2.93+extra,1.24),
  part('cover-left',-x,6.35,0,1.23,2.93+extra,11.35+2*shift),
  part('cover-right',x,6.35,0,1.23,2.93+extra,11.35+2*shift)
 ];
}
function band(outer:number,half:number):readonly Piece[]{
 return [
  part('front-band',0,5.11,-outer,11.15,.72,half),
  part('rear-band',0,5.11,outer,11.15,.72,half),
  part('left-band',-outer,5.11,0,half,.72,11.15),
  part('right-band',outer,5.11,0,half,.72,11.15)
 ];
}
function netStrips():readonly Piece[]{
 const parts:Piece[]=[];
 // Four broad longitudinal strips plus three lateral crossings.
 for(const x of [-3.2,-1.05,1.05,3.2])
  parts.push(part('net-long',x,8.99,0,.30,.28,10.6));
 for(const z of [-3.15,0,3.15])
  parts.push(part('net-cross',0,9.04,z,10.4,.28,.30));
 return parts;
}
function scrimPieces(field:boolean):readonly Piece[]{
 const base:Piece[]=[
  part('scrim-left-front',-5.65,6.0,-3.4,1.9,1.8,.8),
  part('scrim-right-front',5.68,6.1,-2.0,2.3,2.4,.7),
  part('scrim-rear-left',-4.25,6.0,5.52,2.8,1.6,1.05),
  part('scrim-rear-right',3.35,6.2,5.55,2.6,1.8,.85)
 ];
 if(field)base.push(
  part('scrim-long-left',-5.70,7.0,.85,1.0,2.1,2.4),
  part('scrim-long-right',5.75,6.85,2.65,1.15,2.6,1.55),
  part('scrim-rear-high',0,8.6,5.0,2.4,1.3,1.65)
 );
 return base;
}
const hidden=(parent:THREE.Group)=>{const g=new THREE.Group();g.visible=false;parent.add(g);return g;};
export function createM1HelmetCoverLayers(parent:THREE.Group):M1HelmetCoverLayers{
 const fabric=new THREE.MeshStandardMaterial({color:OPERATOR_SOLID_FAMILIES['olive-drab'],
  roughness:.98,metalness:0,flatShading:true,vertexColors:true});
 const support=new THREE.MeshStandardMaterial({color:OPERATOR_SOLID_FAMILIES['olive-drab'],
  roughness:.96,metalness:0,flatShading:true});
 const elastic=new THREE.MeshStandardMaterial({color:OPERATOR_SOLID_FAMILIES.charcoal,
  roughness:.96,metalness:0,flatShading:true});
 const field=new THREE.MeshStandardMaterial({color:OPERATOR_SOLID_FAMILIES['forest-green'],
  roughness:1,flatShading:true});
 // All cover, net and scrim variants use the same pattern-neutral AO.
 for(const material of [fabric,support,elastic,field])
  enableBakedGearAO(material);
 const fitted=hidden(parent),loose=hidden(parent),clothBand=hidden(parent);
 const elasticBand=hidden(parent),net=hidden(parent);
 const sparseScrim=hidden(parent),fieldScrim=hidden(parent);
 mesh(fitted,coverBody(false),fabric,'R5E-fitted-M1-cloth');
 mesh(loose,coverBody(true),fabric,'R5E-loose-M1-cloth');
 mesh(clothBand,band(5.81,.68),support,'R5E-cloth-retaining-band');
 mesh(elasticBand,band(5.81,.68),elastic,'R5E-elastic-retaining-band');
 mesh(net,netStrips(),support,'R5E-low-poly-M1-net');
 mesh(sparseScrim,scrimPieces(false),field,'R5E-sparse-scrim');
 mesh(fieldScrim,scrimPieces(true),field,'R5E-field-scrim');
 return {fitted,loose,clothBand,elasticBand,net,sparseScrim,fieldScrim,
  fabric,support,activePrint:''};
}
export function updateM1HelmetCoverLayers(
 v:M1HelmetCoverLayers,raw:HelmetCoverConfig|undefined,operatorId:string,
 roll=0){
 const c=resolvedHelmetCoverConfig('m1-steel',raw);
 const selected=c.helmetCover??'none';
 v.fitted.visible=selected==='fitted';v.loose.visible=selected==='loose';
 v.clothBand.visible=c.helmetBand==='cloth';
 v.elasticBand.visible=c.helmetBand==='elastic';
 v.net.visible=c.helmetNet==='coarse';
 v.sparseScrim.visible=c.helmetScrim==='sparse';
 v.fieldScrim.visible=c.helmetScrim==='field';
 const print=selected!=='none'?c.helmetCoverCamo:undefined;
 const map=print?headwearCamoTexture('m1-steel',print,
  headwearCamoPlacement(operatorId,'m1-cover',print,roll)):null;
 if(v.fabric.map!==map){v.fabric.map=map;v.fabric.needsUpdate=true;}
 v.fabric.color.setHex(print?0xffffff:OPERATOR_SOLID_FAMILIES['olive-drab']);
 v.activePrint=print??'';
}
