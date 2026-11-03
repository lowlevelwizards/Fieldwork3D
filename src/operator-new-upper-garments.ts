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
  rings:[{y:6.55,front:5.80,back:-6.15,side:7.9},
   {y:4.5,front:6.22,back:-6.20,side:9.35},
   {y:-2.0,front:6.27,back:-6.18,side:8.88},
   {y:-9.1,front:6.63,back:-6.53,side:9.05}] as readonly Ring[],
  collar:'folded hood with tall storm neck',pockets:'four large front and map',outer:true
 },
 'gorka-jacket':{
  rings:[{y:6.58,front:5.83,back:-6.03,side:7.85},
   {y:4.4,front:6.30,back:-6.36,side:9.45},
   {y:-1.9,front:6.35,back:-6.25,side:8.65},
   {y:-8.7,front:6.58,back:-6.52,side:8.74}] as readonly Ring[],
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
 const geom=new THREE.CylinderGeometry(rTop,rBottom,height,10,1,false);
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
 // Hood parked around the collar and behind the scalp; never alters or
 // replaces an approved cap or helmet. Wide mountain hood exaggerates mass.
 box(g,body,-5.6,8.45,0,2.25,4.9,wide?13.2:11.65);
 for(const sign of [-1,1]){
  box(g,body,-3.05,8.7,sign*(wide?6.52:5.74),
   4.0,4.0,1.25,sign*.08);
  box(g,trim,-1.2,10.3,sign*(wide?5.87:5.10),
   2.20,.60,1.20,sign*.12);
 }
 box(g,body,-3.15,10.7,0,5.0,1.0,wide?11.0:10.0);
}
export function createNewUpperGarments(chest:THREE.Group,arms:readonly Arm[],
 cloth:THREE.MeshStandardMaterial,trim:THREE.MeshStandardMaterial):NewUpperGarments{
 const combatKnit=cloth.clone(),mountainCanvas=cloth.clone(),
  mountainPanel=cloth.clone(),mountainLegCanvas=cloth.clone(),
  mountainLegPanel=cloth.clone();
 for(const m of [combatKnit,mountainCanvas,mountainPanel,mountainLegCanvas,mountainLegPanel])
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
   // Thin stretchy knit chest and a high partial zipper; contrasting
   // reinforced raglan shoulders flow into the camouflaged sleeves.
   box(torso,wear,-.40,6.95,0,7.60,1.35,8.1);
   box(torso,wear,4.48,6.50,0,.37,3.65,.47);
   for(const side of [-1,1])
    box(torso,wear,.18,4.85,side*5.80,5.4,1.20,3.0,side*.16);
   box(torso,body,4.92,-5.65,0,.3,.56,12.25);
  }else if(smock){
   foldedHood(torso,cloth,trim);
   // Oversize four-pocket outer storage plus zipped chest document access.
   for(const sign of [-1,1]){
    for(const y of [2.25,-5.2]){
     box(torso,cloth,6.78,y,sign*4.35,1.05,3.38,5.20);
     box(torso,cloth,7.35,y+1.42,sign*4.35,.46,.92,5.46);
    }
    box(torso,trim,7.05,4.40,sign*3.7,.20,2.05,.18);
   }
   box(torso,cloth,6.90,-.30,0,.58,14.3,.50);
   box(torso,trim,6.95,-4.05,0,.23,.16,16.6);
   box(torso,trim,6.95,-8.5,0,.26,.16,17.3);
  }else{
   foldedHood(torso,mountainCanvas,mountainPanel,true);
   for(const sign of [-1,1]){
    // Bold diagonal/rectangular contrast shoulder and upper back pads,
    // high-visibility game-distance Gorka signature.
    box(torso,wear,.65,4.95,sign*6.85,9.2,1.20,3.40,sign*.06);
    box(torso,wear,6.57,-5.25,sign*5.7,.40,3.45,4.8);
    box(torso,body,6.93,-4.35,sign*3.95,.75,3.95,5.40);
    box(torso,wear,7.40,-2.85,sign*3.95,.37,.80,5.55);
   }
   box(torso,wear,6.95,1.9,0,.48,1.18,9.7);
   box(torso,trim,6.94,-2.2,0,.18,.18,15.3);
   box(torso,wear,6.93,-8.12,0,.39,.50,15.0);
  }
  const upper:THREE.Group[]=[],lower:THREE.Group[]=[],
   cuffedLower:THREE.Group[]=[],rolledUpper:THREE.Group[]=[];
  for(const [index,arm] of arms.entries()){
   const u=group(arm.upper,cut+':upper:'+index),
    l=group(arm.lower,cut+':lower:'+index),
    c=group(arm.lower,cut+':cuff:'+index),
    rolled=group(arm.upper,cut+':rolled:'+index);
   const ru=combat?2.97:smock?3.85:4.02,
    rl=combat?2.53:smock?3.11:3.24;
   tube(u,wear,ru,ru-.18);
   tube(l,body===combatKnit?cloth:body,rl,rl-.18);
   if(combat){
    tube(c,cloth,rl+.16,rl+.19,.76,-.145);
    tube(c,cloth,rl+.42,rl+.42,.23,.205);
    tube(rolled,cloth,ru,ru-.18,.82,-.11);
    tube(rolled,cloth,ru+.35,ru+.35,.17,.29);
    // Bicep pocket and padded elbow are large enough for the Lab zoom.
    for(const part of [u,rolled]){
     box(part,wear,0,.18,ru+.18,2.84,.35,1.17);
     box(part,trim,0,.33,ru+.26,2.75,.09,1.17);
    }
    box(l,wear,2.40,-.03,0,.21,.40,3.12);
    box(c,wear,2.40,-.12,0,.21,.32,3.12);
   }else if(smock){
    box(u,cloth,0,.23,ru+.15,3.48,.28,1.15);
    box(u,trim,0,.33,ru+.28,3.34,.075,1.25);
    tube(l,trim,rl+.18,rl+.18,.16,.39);
   }else{
    box(u,wear,1.95,.07,ru-.55,.35,.60,5.55);
    box(l,wear,2.27,-.04,0,.27,.70,5.95);
    tube(l,wear,rl+.28,rl+.28,.22,.36);
    // Strong gathered sleeve tightening straps.
    box(l,wear,0,.30,rl+.19,3.85,.15,.72);
   }
   for(const part of [u,l,c,rolled])consolidateVisualGroup(part);
   upper.push(u);lower.push(l);cuffedLower.push(c);rolledUpper.push(rolled);
  }
  consolidateVisualGroup(torso);
  cuts[cut]={torso,upper,lower,cuffedLower,rolledUpper};
 }
 return {cuts,combatKnit,mountainCanvas,mountainPanel,mountainLegCanvas,mountainLegPanel};
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
