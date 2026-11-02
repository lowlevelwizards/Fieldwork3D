/** Body wardrobe accents on existing articulated parts. No new bones or
 * runtime model construction. A choice toggles a small, cohesive geometry
 * family; the true hitbox, inventory and IK contacts are untouched.
 */
import * as THREE from 'three';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';
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
 const mesh=new THREE.Mesh(mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d),m);
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
 const tops:Record<string,THREE.Group>={};
 for(const item of wardrobeItemsForSlot('top')){
  const g=group(chest);tops[item.id]=g;
  switch(item.id){
   case 'field-jacket':case 'bdu-shirt':case 'acu-shirt':
    for(const side of [-1,1])
     part(g,cloth,5.6,1.45,side*3.35,.6,2.1,2.9);
    if(item.id==='bdu-shirt')
     part(g,dark,5.94,2.65,0,.26,.4,9.2);
    if(item.id==='acu-shirt')
     for(const side of [-1,1])
      part(g,accent,5.96,2.4,side*3.35,.22,.5,2.2);
    break;
   case 'combat-shirt':
    part(g,accent,5.65,2.0,0,.30,4.1,6.3);
    break;
   case 'flannel':case 'button-short':case 'button-long':
    part(g,dark,5.6,.2,0,.22,8.2,.35);
    for(let y=-3.5;y<3;y+=2)
     part(g,accent,5.76,y,0,.19,.27,.31);
    break;
   case 'turtleneck':
    part(g,cloth,0,6.35,0,4.8,2.0,6.2);break;
   case 'tactical-sweater':
    part(g,accent,5.5,-4.5,0,.34,1.15,12.6);break;
   case 'softshell':case 'softshell-hood':case 'pcu-shell':
    part(g,dark,5.6,-.3,0,.3,8.1,.4);
    part(g,cloth,-2.9,6.3,0,5.6,1.45,9.2);
    if(item.id==='softshell-hood')
     part(g,cloth,-4.6,6.7,0,3.2,2.2,8.3);
    if(item.id==='pcu-shell')
     part(g,cloth,5.5,-4.9,0,.65,1.1,13.4);
    break;
   case 'longsleeve':
    part(g,accent,5.45,-5.1,0,.32,.5,11.5);break;
   case 'tank-top':
    for(const side of [-1,1])
     part(g,cloth,0,6.0,side*4.6,2.0,.7,1.1);
    break;
   default:break;
  }
 }
 const legAccents:Groups={},kneePads:Groups={};
 for(const item of wardrobeItemsForSlot('trousers')){
  legAccents[item.id]=legs.map(leg=>{
   const g=group(leg.upper);
   if(['bdu-trousers','acu-trousers','combat-trousers','field-trousers',
    'work-pants'].includes(item.id))
    part(g,trousersMaterial,0,.1,3.05,3.4,.35,1.7);
   if(item.id==='jeans'||item.id==='track-pants')
    part(g,accent,0,0,2.93,3.5,.16,.22);
   if(item.id==='shorts')
    part(g,accent,0,-.5,2.9,4.15,.5,.25);
   return g;
  });
 }
 for(const item of wardrobeItemsForSlot('knees')){
  kneePads[item.id]=legs.map(leg=>{
   const g=group(leg.lower);
   if(item.id!=='knee-none'){
    const w=item.id==='knee-hard'?4.5:3.8;
    part(g,item.id==='knee-hard'?dark:accent,0,.1,2.65,w,
     item.id==='knee-integrated'?.26:.58,item.id==='knee-hard'?2.6:1.9);
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
