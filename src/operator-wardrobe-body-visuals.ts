/** Body wardrobe accents on existing articulated parts. No new bones or
 * runtime model construction. A choice toggles a small, cohesive geometry
 * family; the true hitbox, inventory and IK contacts are untouched.
 */
import * as THREE from 'three';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import {wardrobeItemsForSlot} from './operator-wardrobe-data.ts';
type Limb={upper:THREE.Mesh;lower:THREE.Mesh;hand?:THREE.Mesh};
type Groups=Record<string,THREE.Group[]>;
export type WardrobeBodyLayers={
 tops:Record<string,THREE.Group>;
 trousers:Groups;knees:Groups;
 wrist:Record<string,THREE.Group>;
};
const part=(p:THREE.Group,m:THREE.Material,
 x:number,y:number,z:number,w:number,h:number,d:number)=>{
 const mesh=new THREE.Mesh(garmentBoxUV(new THREE.BoxGeometry(w,h,d),w,h,d,m,x,y,z),m);
 mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
 p.add(mesh);return mesh;
};
const group=(p:THREE.Object3D)=>{
 const g=new THREE.Group();g.visible=false;p.add(g);return g;
};
export function createWardrobeBodyLayers(chest:THREE.Group,
 legs:readonly Limb[],arms:readonly Limb[],
 cloth:THREE.Material,trousersMaterial:THREE.Material,
 accent:THREE.Material,dark:THREE.Material):WardrobeBodyLayers{
 // Legacy cuboid upper-body accents are deleted, not hidden.
 // Approved BDU / ACU actual torso and sleeves live in field-blouse-prototypes.
 void cloth;
 const tops:Record<string,THREE.Group>={};
 for(const item of wardrobeItemsForSlot('top'))
  tops[item.id]=group(chest);
 const legAccents:Groups={},kneePads:Groups={};
 for(const item of wardrobeItemsForSlot('trousers')){
  legAccents[item.id]=legs.map(leg=>{
   const g=group(leg.upper);
   if(item.id==='field-trousers')
    part(g,trousersMaterial,0,.1,3.05,3.4,.35,1.7);
   return g;
  });
 }
 for(const item of wardrobeItemsForSlot('knees')){
  kneePads[item.id]=legs.map(leg=>{
   const g=group(leg.lower);
   if(item.id!=='knee-none'){
    part(g,dark,0,.1,2.65,4.5,.58,2.6);
   }
   return g;
  });
 }
 const wrist:Record<string,THREE.Group>={};
 for(const item of wardrobeItemsForSlot('wrist')){
  const g=group(arms[0].lower);wrist[item.id]=g;
  if(item.id==='watch'){
   part(g,dark,0,-.5,0,4.0,.55,3.7);
   part(g,accent,0,-.53,2.05,1.6,.4,.24);
  }else if(item.id==='wrist-nav'){
   part(g,dark,0,-.5,0,4.3,.75,4.0);
   part(g,accent,0,-.55,2.27,2.6,.38,.24);
  }
 }
 for(const groupList of [Object.values(tops),...Object.values(legAccents),
  ...Object.values(kneePads),Object.values(wrist)])
  for(const g of groupList)consolidateVisualGroup(g);
 return {tops,trousers:legAccents,knees:kneePads,wrist};
}
export function updateWardrobeBodyLayers(v:WardrobeBodyLayers,
 top:string,trousers:string,knee:string,wrist:string){
 for(const [id,g] of Object.entries(v.tops))g.visible=id===top;
 for(const [id,groups] of Object.entries(v.trousers))
  for(const g of groups)g.visible=id===trousers;
 for(const [id,groups] of Object.entries(v.knees))
  for(const g of groups)g.visible=id===knee;
 for(const [id,g] of Object.entries(v.wrist))g.visible=id===wrist;
}
