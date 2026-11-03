/** Stage 4: three genuinely new upper garments, not stretched BDU assets.
 * All cosmetic shells parent to the established torso and articulated bones.
 * No headgear geometry, IK transform, collision or weapon grip is modified.
 */
import * as THREE from 'three';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {TILE_WORLD_SIZE} from './rendering/pixel-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import type {SleeveState} from './operator-wardrobe-data.ts';

export const NEW_UPPER_CUTS=['combat-shirt','smock-jacket','gorka-jacket'] as const;
export type NewUpperCut=typeof NEW_UPPER_CUTS[number];
type Ring={y:number;front:number;back:number;side:number};
type Arm={upper:THREE.Mesh;lower:THREE.Mesh};
export const UPPER_CUT_PROFILES={
 'combat-shirt':{
  rings:[{y:6.5,front:5.10,back:-5.10,side:6.65},
   {y:4.3,front:5.20,back:-5.10,side:6.89},
   {y:-1.5,front:5.06,back:-4.98,side:6.40},
   {y:-6.1,front:4.80,back:-4.78,side:6.36}] as readonly Ring[],
  collar:'high zip',pockets:'upper sleeve',outer:false
 },
 'smock-jacket':{
  rings:[{y:6.55,front:5.60,back:-5.75,side:7.35},
   {y:4.5,front:6.02,back:-5.97,side:8.12},
   {y:-2.0,front:6.06,back:-6.00,side:7.83},
   {y:-8.55,front:6.17,back:-6.10,side:8.00}] as readonly Ring[],
  collar:'folded hood with tall storm neck',pockets:'four large front and map',outer:true
 },
 'gorka-jacket':{
  rings:[{y:6.58,front:5.58,back:-5.77,side:7.38},
   {y:4.4,front:6.10,back:-6.10,side:8.10},
   {y:-1.9,front:6.14,back:-6.11,side:7.72},
   {y:-7.90,front:6.27,back:-6.20,side:7.84}] as readonly Ring[],
  collar:'deep mountain hood',pockets:'large kangaroo or reinforced cargo',outer:true
 }
} as const;
export type NewUpperPrototype={
 torso:THREE.Group;upper:THREE.Group[];lower:THREE.Group[];
 cuffedLower:THREE.Group[];rolledUpper:THREE.Group[];
};
export type NewUpperGarments={
 cuts:Record<NewUpperCut,NewUpperPrototype>;
 /** Knit torso is a plain color; camouflage lives on the sleeves. */
 combatKnit:THREE.MeshStandardMaterial;
 /** Independent solid cuffs, never receiving a camouflage print. */
 smockCuff:THREE.MeshStandardMaterial;
 gorkaCuff:THREE.MeshStandardMaterial;
 /** Gorka's heavy base cloth is separate from patterned wear panels. */
 mountainCanvas:THREE.MeshStandardMaterial;
 mountainPanel:THREE.MeshStandardMaterial;
 mountainLegCanvas:THREE.MeshStandardMaterial;
 mountainLegPanel:THREE.MeshStandardMaterial;
};
const group=(parent:THREE.Object3D,name:string)=>{
 const g=new THREE.Group();g.name=name;g.visible=false;parent.add(g);return g;
};
function box(g:THREE.Group,m:THREE.Material,
 x:number,y:number,z:number,w:number,h:number,d:number,rot=0){
 const mesh=new THREE.Mesh(garmentBoxUV(new THREE.BoxGeometry(w,h,d),
  w,h,d,m,x,y,z),m);
 mesh.position.set(x,y,z);mesh.rotation.x=rot;
 mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
 return mesh;
}
function shell(parent:THREE.Group,m:THREE.Material,rings:readonly Ring[]){
 const pts:number[]=[],uv:number[]=[];
 for(let i=0;i<rings.length-1;i++){
  const a=rings[i],b=rings[i+1];
  const qa=[[a.front,a.y,-a.side],[a.front,a.y,a.side],
   [a.back,a.y,a.side],[a.back,a.y,-a.side]];
  const qb=[[b.front,b.y,-b.side],[b.front,b.y,b.side],
   [b.back,b.y,b.side],[b.back,b.y,-b.side]];
  for(let j=0;j<4;j++){
   const k=(j+1)%4;
   const tri=[qa[j],qa[k],qb[k],qa[j],qb[k],qb[j]];
   const w=Math.hypot(qa[k][0]-qa[j][0],qa[k][2]-qa[j][2]);
   const v0=(a.y-rings[0].y)/TILE_WORLD_SIZE;
   const v1=(b.y-rings[0].y)/TILE_WORLD_SIZE;
   const st=[[0,v0],[w/TILE_WORLD_SIZE,v0],[w/TILE_WORLD_SIZE,v1],
    [0,v0],[w/TILE_WORLD_SIZE,v1],[0,v1]];
   for(let n=0;n<6;n++){pts.push(...tri[n]);uv.push(...st[n]);}
  }
 }
 const geom=new THREE.BufferGeometry();
 geom.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
 geom.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geom.setIndex(Array.from({length:pts.length/3},(_,i)=>i));
 geom.computeVertexNormals();
 const mesh=new THREE.Mesh(geom,m);
 mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function tube(g:THREE.Group,m:THREE.Material,
 rTop:number,rBottom:number,height=1.05,shift=0){
 const geom=new THREE.CylinderGeometry(rTop,rBottom,height,8,1,false);
 if(shift)geom.translate(0,shift,0);
 const uv=geom.getAttribute('uv') as THREE.BufferAttribute;
 const w=Math.PI*(rTop+rBottom);
 for(let i=0;i<uv.count;i++)
  uv.setXY(i,uv.getX(i)*w/TILE_WORLD_SIZE,
   uv.getY(i)*height*10/TILE_WORLD_SIZE);
 uv.needsUpdate=true;
 const mesh=new THREE.Mesh(geom,m);
 mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
}
function foldedHood(g:THREE.Group,body:THREE.Material,
 trim:THREE.Material,wide=false){
 // Three low sewn masses tucked BEHIND the neck, not a second helmet and
 // not a pair of unattached upright spikes. Keep the headwear volume clear.
 box(g,body,-5.28,7.30,0,1.45,2.45,wide?11.8:11.1);
 for(const sign of [-1,1]){
  box(g,body,-4.66,7.25,sign*4.55,1.72,1.80,2.32);
  box(g,trim,-4.56,8.08,sign*4.56,.22,.24,2.13);
 }
}
export function createNewUpperGarments(chest:THREE.Group,arms:readonly Arm[],
 cloth:THREE.MeshStandardMaterial,trim:THREE.MeshStandardMaterial):NewUpperGarments{
 const combatKnit=cloth.clone(),smockCuff=cloth.clone(),
  gorkaCuff=cloth.clone(),mountainCanvas=cloth.clone(),
  mountainPanel=cloth.clone(),mountainLegCanvas=cloth.clone(),
  mountainLegPanel=cloth.clone();
 for(const m of [combatKnit,smockCuff,gorkaCuff,mountainCanvas,mountainPanel,mountainLegCanvas,mountainLegPanel])
  m.userData.fieldworkFabric=true;
 const cuts={} as Record<NewUpperCut,NewUpperPrototype>;
 for(const cut of NEW_UPPER_CUTS){
  const combat=cut==='combat-shirt',smock=cut==='smock-jacket',
   gorka=cut==='gorka-jacket';
  const body=combat?combatKnit:gorka?mountainCanvas:cloth;
  const wear=gorka?mountainPanel:cloth;
  const torso=group(chest,'upper-garment:'+cut);
  shell(torso,body,UPPER_CUT_PROFILES[cut].rings);
  if(combat){
   // The solid knit runs uninterrupted from collar to hem, including the
   // entire front. Patterned material is confined to the shoulders/arms.
   box(torso,body,5.19,-.05,0,.24,11.68,10.88);
   box(torso,body,0,6.48,0,7.70,1.02,7.20);
   box(torso,trim,5.38,4.78,0,.14,2.18,.28);
   for(const side of [-1,1])
    box(torso,wear,.15,4.95,side*5.78,4.65,.68,2.02);
   box(torso,body,5.12,-5.79,0,.17,.34,10.85);
  }else if(smock){
   foldedHood(torso,cloth,smockCuff);
   // Four discrete patch pockets, shallow enough to read as cloth, not
   // armor blocks. Hem stays below the blouse, but the torso stays stubby.
   for(const sign of [-1,1]){
    for(const y of [1.92,-4.77]){
     box(torso,cloth,6.21,y,sign*3.66,.42,2.96,4.65);
     box(torso,cloth,6.47,y+1.31,sign*3.66,.20,.61,4.88);
    }
    box(torso,trim,6.26,4.18,sign*3.65,.13,1.32,.14);
   }
   box(torso,cloth,6.22,-.60,0,.35,13.6,.34);
   box(torso,smockCuff,6.26,-7.97,0,.17,.29,14.25);
  }else{
   foldedHood(torso,mountainCanvas,gorkaCuff,true);
   // The Gorka reads by two broad reinforcement fields and a snug anorak
   // waist, not plates, fins, or a shoulder-spanning stack of boxes.
   for(const sign of [-1,1]){
    box(torso,wear,.35,4.12,sign*7.94,7.00,1.30,.25);
    box(torso,wear,6.30,2.42,sign*5.38,.22,2.45,3.56);
    box(torso,body,6.39,-4.50,sign*3.72,.37,3.14,4.35);
    box(torso,wear,6.64,-3.11,sign*3.72,.17,.59,4.47);
   }
   box(torso,wear,6.34,1.8,0,.18,.65,7.80);
   box(torso,gorkaCuff,6.35,-7.43,0,.23,.40,14.20);
  }
  const upper:THREE.Group[]=[],lower:THREE.Group[]=[],
   cuffedLower:THREE.Group[]=[],rolledUpper:THREE.Group[]=[];
  for(const [index,arm] of arms.entries()){
   const u=group(arm.upper,cut+':upper:'+index),
    l=group(arm.lower,cut+':lower:'+index),
    c=group(arm.lower,cut+':cuff:'+index),
    rolled=group(arm.upper,cut+':rolled:'+index);
   const ru=combat?2.97:smock?3.48:3.63,
    rl=combat?2.53:smock?2.88:3.00;
   // Local limb segment range is [-.5,+.5]. Stop before the real wrist,
   // and leave knee/hand contacts entirely to the existing IK.
   tube(u,combat?cloth:body,ru,ru-.18,.96,-.015);
   tube(l,combat?cloth:body,rl,rl-.18,.91,-.035);
   if(combat){
    tube(c,cloth,rl+.12,rl+.14,.70,-.155);
    tube(c,combatKnit,rl+.27,rl+.27,.17,.16);
    tube(rolled,cloth,ru,ru-.12,.76,-.11);
    tube(rolled,combatKnit,ru+.25,ru+.25,.18,.23);
    // Bicep pocket and padded elbow are large enough for the Lab zoom.
    for(const part of [u,rolled]){
     box(part,wear,0,.18,ru+.18,2.84,.35,1.17);
     box(part,trim,0,.33,ru+.26,2.75,.09,1.17);
    }
    box(l,wear,2.38,-.03,0,.18,.33,2.78);
   }else if(smock){
    box(u,cloth,0,.23,ru+.15,3.48,.28,1.15);
    box(u,trim,0,.33,ru+.28,3.34,.075,1.25);
    tube(l,smockCuff,rl+.15,rl+.15,.15,.375);
   }else{
    box(u,wear,1.95,.07,ru-.55,.35,.60,5.55);
    box(l,wear,2.27,-.04,0,.27,.70,5.95);
    tube(l,gorkaCuff,rl+.16,rl+.16,.17,.36);
   }
   for(const part of [u,l,c,rolled])consolidateVisualGroup(part);
   upper.push(u);lower.push(l);cuffedLower.push(c);rolledUpper.push(rolled);
  }
  consolidateVisualGroup(torso);
  cuts[cut]={torso,upper,lower,cuffedLower,rolledUpper};
 }
 return {cuts,combatKnit,smockCuff,gorkaCuff,mountainCanvas,mountainPanel,mountainLegCanvas,mountainLegPanel};
}
export function updateNewUpperGarments(
 models:NewUpperGarments,top:string,sleeve:SleeveState){
 for(const cut of NEW_UPPER_CUTS){
  const on=cut===top,model=models.cuts[cut];
  const combat=cut==='combat-shirt',roll=combat&&sleeve==='rolled',
   cuff=combat&&sleeve==='cuffed';
  model.torso.visible=on;
  for(const g of model.upper)g.visible=on&&!roll;
  for(const g of model.lower)g.visible=on&&!roll&&!cuff;
  for(const g of model.cuffedLower)g.visible=on&&cuff;
  for(const g of model.rolledUpper)g.visible=on&&roll;
 }
}
