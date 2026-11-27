import type {PackMountMode} from './operator-equipment-assembly.ts';
/** Canonical backpack visuals shared by gameplay, inspection and Studio. Does not change loadout IDs or inventory. */
import * as THREE from 'three';
import {packDetailPalette} from './operator-backpack-colors.ts';
import {packGraphicAtlas} from './operator-backpack-graphics.ts';
import {authoredPackStyle,buildAuthoredPack,type AuthoredPack,type AuthoredPackStyle} from './operator-backpack-art.ts';
import {buildPackHarness,fitPack,mountPackArtwork,type PackFit} from './operator-backpack-fit.ts';
import {packRibbon,packBox,finishPackArtwork,type PackPoint,type PackMaterials} from './operator-backpack-geometry.ts';
import {equipmentExterior} from './operator-equipment-exterior.ts';
export type PackPreviewState={
 parent:THREE.Object3D;chest:THREE.Group;materials:PackMaterials;
 models:Map<AuthoredPackStyle,AuthoredPack>;active?:AuthoredPack;
 harness?:THREE.Group;key?:string;fit?:PackFit;
};
export function createPackPreview(parent:THREE.Object3D,chest:THREE.Group,materials:PackMaterials):PackPreviewState{
 return {parent,chest,materials:{fabric:materials.fabric,trim:materials.trim.clone(),dark:materials.dark.clone()},models:new Map()};
}
export function applyPackDetailPalette(state:PackPreviewState,hex:number,colors:Map<THREE.MeshStandardMaterial|THREE.MeshBasicMaterial,THREE.Color>){
 if(!state.active)return;
 const p=packDetailPalette(hex);
 for(const [material,value] of [[state.materials.trim,p.trimHex],[state.materials.dark,p.hardwareHex]] as const){
  if(material instanceof THREE.MeshStandardMaterial){material.color.setHex(value);colors.set(material,material.color.clone());}
 }
 const graphic=state.active.root.getObjectByName('pack-pixel-graphics');
 if(graphic instanceof THREE.Mesh&&graphic.material instanceof THREE.MeshStandardMaterial){
  const map=packGraphicAtlas(hex);if(graphic.material.map!==map){graphic.material.map=map;graphic.material.needsUpdate=true;}
 }
}
function removeHarness(state:PackPreviewState){
 if(!state.harness)return;
 state.harness.removeFromParent();
 state.harness.traverse(obj=>{if(obj instanceof THREE.Mesh)obj.geometry.dispose();});
 state.harness=undefined;
}
function addHose(state:PackPreviewState,fit:PackFit,armor:string,rig:string,top:string){
 const root=new THREE.Group(),m=state.materials;
 root.name='hydration-hose';
 const surface=equipmentExterior(armor,rig,top);
 const [cx,cy]=fit.center;
 const [, ,sz]=surface.shoulder(1);
 const z=Math.max(2.0,Math.min(sz-.95,3.3));
 const hoseWidth=.55;
 const contact=surface.shoulderContour(1,z,hoseWidth,hoseWidth);
 const points:PackPoint[]=[
  [cx+.3,cy+5.65,1.6],
  contact.rear,contact.crown,contact.front,
  [surface.front(3.8,z+.15)+.24,3.8,z+.15],
  [surface.front(2.3,z+.25)+.26,2.3,z+.25]
 ];
 // A few chunky angled hose segments and one bite valve.
 const spans=points.slice(1).map((b,i)=>{
  const a=points[i],dir=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize();
  const normal:PackPoint=Math.abs(dir.x)<.85?[1,0,0]:[0,1,0];
  return {a,b,normal,width:hoseWidth,thickness:hoseWidth};
 });
 packRibbon(root,'hose',m.dark,spans);
 packBox(root,'bite-valve',m.dark,points[points.length-1],[.65,1.0,.67]);
 finishPackArtwork(root);state.harness?.add(root);
}
export function updatePackPreview(state:PackPreviewState,enabled:boolean,style:string,armor:string,rig:string,top:string,mode:PackMountMode='auto',belt='no-belt'){
 const id=enabled?authoredPackStyle(style):undefined;
 const key=[id,armor,rig,top,mode,belt].join('|');
 if(state.key===key)return state.active;
 state.key=key;
 if(state.active)state.active.root.visible=false;
 state.active=undefined;state.fit=undefined;removeHarness(state);
 if(!id)return undefined;
 // Validate mount before constructing an incompatible variant.
 if(!fitPack(id,armor,rig,top,undefined,mode,belt).compatible)return undefined;
 let art=state.models.get(id);
 if(!art){art=buildAuthoredPack(id,state.materials);state.models.set(id,art);state.parent.add(art.root);}
 const fit=fitPack(id,armor,rig,top,art.mount,mode,belt);
 mountPackArtwork(art.root,fit);
 state.active=art;state.fit=fit;
 if(fit.spans.length||id==='hydration'){
  state.harness=buildPackHarness(fit,state.materials);
  state.chest.add(state.harness);
  if(id==='hydration')addHose(state,fit,armor,rig,top);
 }
 return art;
}
