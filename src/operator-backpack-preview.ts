/** Opt-in art preview. Does not change loadout IDs or inventory. */
import * as THREE from 'three';
import {authoredPackStyle,buildAuthoredPack,type AuthoredPack,type AuthoredPackStyle} from './operator-backpack-art.ts';
import {buildPackHarness,fitPack,mountPackArtwork,type PackFit} from './operator-backpack-fit.ts';
import {packWebbing,packBox,finishPackArtwork,type PackPoint,type PackMaterials} from './operator-backpack-geometry.ts';
import {equipmentExterior} from './operator-equipment-exterior.ts';
export type PackPreviewState={
 parent:THREE.Object3D;chest:THREE.Group;materials:PackMaterials;
 models:Map<AuthoredPackStyle,AuthoredPack>;active?:AuthoredPack;
 harness?:THREE.Group;key?:string;fit?:PackFit;
};
export function createPackPreview(parent:THREE.Object3D,chest:THREE.Group,materials:PackMaterials):PackPreviewState{
 return {parent,chest,materials,models:new Map()};
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
 const [,sy,sz]=surface.shoulder(1);
 const z=Math.min(sz,3.9);
 const front=surface.front(3.8,z);
 const points:PackPoint[]=[
  [cx+.3,cy+4.65,2],
  [surface.back(5,z)-.22,sy+.36,z],
  [0,sy+.39,z],
  [surface.front(5,z)+.24,sy+.24,z],
  [front+.40,3.8,z+.25],
  [surface.front(2.3,z+.25)+.38,2.3,z+.25]
 ];
 // A few chunky angled hose segments and one bite valve.
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];
  const dir=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize();
  const normal:PackPoint=Math.abs(dir.x)<.85?[1,0,0]:[0,1,0];
  packWebbing(root,'hose-'+i,m.dark,a,b,.35,.35,normal);
 }
 packBox(root,'bite-valve',m.dark,points[points.length-1],[.45,.8,.49]);
 finishPackArtwork(root);state.harness?.add(root);
}
export function updatePackPreview(state:PackPreviewState,enabled:boolean,style:string,armor:string,rig:string,top:string){
 const id=enabled?authoredPackStyle(style):undefined;
 const key=[id,armor,rig,top].join('|');
 if(state.key===key)return state.active;
 state.key=key;
 if(state.active)state.active.root.visible=false;
 state.active=undefined;state.fit=undefined;removeHarness(state);
 if(!id)return undefined;
 // Validate mount before constructing an incompatible variant.
 if(!fitPack(id,armor,rig,top).compatible)return undefined;
 let art=state.models.get(id);
 if(!art){art=buildAuthoredPack(id,state.materials);state.models.set(id,art);state.parent.add(art.root);}
 const fit=fitPack(id,armor,rig,top,art.mount);
 mountPackArtwork(art.root,fit);
 state.active=art;state.fit=fit;
 if(fit.spans.length){
  state.harness=buildPackHarness(fit,state.materials);
  state.chest.add(state.harness);
  if(id==='hydration')addHose(state,fit,armor,rig,top);
 }
 return art;
}
