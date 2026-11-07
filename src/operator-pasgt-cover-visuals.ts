/** PASGT P4-D — one taut fitted cover and one clean period field-dress layer.
 * The original PASGT shell stays untouched in operator-headwear-silhouettes.
 * No separate "loose" shell, no sewn-loop variants or crossed-basket bands.
 */
import * as THREE from 'three';
import {createPasgtDrapedGeometry} from './operator-pasgt-drape-geometry.ts';
import {pasgtCoverTexture} from './operator-pasgt-cover-texture.ts';
import {createPasgtFieldDress,updatePasgtFieldDress,
 updatePasgtSlitShading,type PasgtFieldDressLayers} from './operator-pasgt-field-dress.ts';
import type {HeadwearCamoId} from './operator-headwear-camo.ts';
import type {PasgtDetails} from './operator-pasgt-cover-policy.ts';
export {pasgtCoverTexture} from './operator-pasgt-cover-texture.ts';
const hidden=(p:THREE.Group,name:string)=>{
 const g=new THREE.Group();g.visible=false;g.name=name;p.add(g);return g;
};
export type PasgtCoverLayers={
 fabric:THREE.MeshStandardMaterial;
 cover:THREE.Group;hem:THREE.Group;
 hardware:THREE.Group;field:PasgtFieldDressLayers;
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
 // Four purposeful suspension screw heads on the exposed composite shell:
 // two per side in the front-temple and rear-strap regions. The fitted cloth
 // conceals this hardware completely, just as an actual cover would.
 const hardware=hidden(parent,'pasgt-exposed-shell-suspension-screws');
 const screwMat=new THREE.MeshStandardMaterial({
  color:0x6b705f,roughness:.86,metalness:0,flatShading:true
 });
 const screwGeo=new THREE.BoxGeometry(.15,.47,.47);
 for(const sign of [-1,1] as const)for(const z of [-2.65,2.30]){
  const bolt=new THREE.Mesh(screwGeo,screwMat);
  bolt.name='pasgt-shell-retention-bolt';
  bolt.position.set(sign*5.23,z<0?5.22:4.73,z);
  bolt.castShadow=false;bolt.receiveShadow=false;
  hardware.add(bolt);
 }
 const field=createPasgtFieldDress(parent);
 return {fabric,cover,hem,hardware,field,activePrint:''};
}
export function updatePasgtCoverLayers(v:PasgtCoverLayers,covered:boolean,
 details:PasgtDetails,camo:HeadwearCamoId|undefined,
 identity:string,roll=0,allowRetention=true):void{
 v.cover.visible=covered;v.hem.visible=covered;
 v.hardware.visible=!covered;
 updatePasgtFieldDress(v.field,covered,details,camo,allowRetention);
 // No texture rebind when the hidden cover is removed: keep the chosen
 // print for later restoration without extra GPU uploads.
 if(!covered){v.activePrint='';return;}
 const map=pasgtCoverTexture(camo,identity,roll);
 if(v.fabric.map!==map){v.fabric.map=map;v.fabric.needsUpdate=true;}
 updatePasgtSlitShading(v.field,map);
 v.activePrint=camo??'solid';
}
