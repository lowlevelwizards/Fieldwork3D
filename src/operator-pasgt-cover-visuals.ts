/** PASGT P4-D — one taut fitted cover and one clean period field-dress layer.
 * The original PASGT shell stays untouched in operator-headwear-silhouettes.
 * No separate "loose" shell, no sewn-loop variants or crossed-basket bands.
 */
import * as THREE from 'three';
import {createPasgtDrapedGeometry} from './operator-pasgt-drape-geometry.ts';
import {pasgtCoverTexture} from './operator-pasgt-cover-texture.ts';
import {createPasgtFieldDress,updatePasgtFieldDress,
 type PasgtFieldDressLayers} from './operator-pasgt-field-dress.ts';
import type {HeadwearCamoId} from './operator-headwear-camo.ts';
import type {PasgtDetails} from './operator-pasgt-cover-policy.ts';
export {pasgtCoverTexture} from './operator-pasgt-cover-texture.ts';
const hidden=(p:THREE.Group,name:string)=>{
 const g=new THREE.Group();g.visible=false;g.name=name;p.add(g);return g;
};
export type PasgtCoverLayers={
 fabric:THREE.MeshStandardMaterial;
 cover:THREE.Group;hem:THREE.Group;
 field:PasgtFieldDressLayers;
 activePrint:string;
};
export function createPasgtCoverLayers(parent:THREE.Group):PasgtCoverLayers{
 // Textile source pixels remain neutral. No additional baked vertex-color
 // multiplier, no painted-shell color multiply or shell shadow receiving.
 const fabric=new THREE.MeshStandardMaterial({
  color:0xffffff,roughness:.97,metalness:0,flatShading:true,
  vertexColors:false,side:THREE.FrontSide
 });
 fabric.map=pasgtCoverTexture(undefined,'default');
 const cover=hidden(parent,'pasgt-bridged-fitted-cover');
 const body=new THREE.Mesh(createPasgtDrapedGeometry(),fabric);
 body.name='pasgt-few-wide-fabric-planes';body.castShadow=true;
 body.receiveShadow=false;cover.add(body);
 const hem=hidden(parent,'pasgt-exposed-shell-hem');
 const ribbon=new THREE.Mesh(createPasgtDrapedGeometry(true),fabric);
 ribbon.name='pasgt-continuous-cloth-fold';ribbon.castShadow=false;
 ribbon.receiveShadow=false;hem.add(ribbon);
 const field=createPasgtFieldDress(parent);
 return {fabric,cover,hem,field,activePrint:''};
}
export function updatePasgtCoverLayers(v:PasgtCoverLayers,covered:boolean,
 details:PasgtDetails,camo:HeadwearCamoId|undefined,
 identity:string,roll=0,allowRetention=true):void{
 v.cover.visible=covered;v.hem.visible=covered;
 updatePasgtFieldDress(v.field,covered,details,camo,allowRetention);
 // No texture rebind when the hidden cover is removed: keep the chosen
 // print for later restoration without extra GPU uploads.
 if(!covered){v.activePrint='';return;}
 const map=pasgtCoverTexture(camo,identity,roll);
 if(v.fabric.map!==map){v.fabric.map=map;v.fabric.needsUpdate=true;}
 v.activePrint=camo??'solid';
}
