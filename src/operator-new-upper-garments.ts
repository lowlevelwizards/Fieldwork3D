/** Stage 4: three genuinely new upper garments, not stretched BDU assets.
 * All cosmetic shells parent to the established torso and articulated bones.
 * No headgear geometry, IK transform, collision or weapon grip is modified.
 */
import * as THREE from 'three';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {TILE_WORLD_SIZE} from './rendering/pixel-materials.ts';
import {outwardLimbPocket,outwardLimbPatch} from './operator-garment-mount-frame.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import type {SleeveState} from './operator-wardrobe-data.ts';

export const NEW_UPPER_CUTS=['combat-shirt','smock-jacket','gorka-jacket'] as const;
export type NewUpperCut=typeof NEW_UPPER_CUTS[number];
type Ring={y:number;front:number;back:number;side:number};
type Arm={upper:THREE.Mesh;lower:THREE.Mesh};
export const UPPER_CUT_PROFILES={
 'combat-shirt':{
  rings:[{y:6.5,front:5.56,back:-5.56,side:7.28},
   {y:4.3,front:5.68,back:-5.61,side:7.48},
   {y:-1.5,front:5.65,back:-5.60,side:7.32},
   {y:-6.1,front:5.55,back:-5.55,side:7.26}] as readonly Ring[],
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
 // Four broad planes read as cut-and-sewn rectangular sleeves at combat zoom.
 const geom=new THREE.CylinderGeometry(rTop,rBottom,height,4,1,false);
 geom.rotateY(Math.PI/4);
 if(shift)geom.translate(0,shift,0);
 const uv=geom.getAttribute('uv') as THREE.BufferAttribute;
 const w=2*Math.SQRT2*(rTop+rBottom);
 for(let i=0;i<uv.count;i++)
  uv.setXY(i,uv.getX(i)*w/TILE_WORLD_SIZE,
   uv.getY(i)*height*10/TILE_WORLD_SIZE);
 uv.needsUpdate=true;
 const mesh=new THREE.Mesh(geom,m);
 mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
}
function foldedHood(g:THREE.Group,body:THREE.Material,
 wide=false){
 // Folded hood is ONE solid collapsed roll behind the neck. The old
 // separate side boxes looked like disconnected shoulder antennas.
 box(g,body,-5.34,6.93,0,1.74,1.36,wide?11.65:10.85);
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
   // A SINGLE knit shell covers the torso front, sides and back. No
   // overlapping tan chest slab; the shell now encloses the hidden 10×12×14
   // base body so it cannot leak a second garment color at the waist.
   // Neck in this actual rig lives at chest-local (0,7,0), and is
   // 3.6 × 3.8 in plan. The collar hugs that neck rather than floating
   // at the extreme edges of the torso: compact, boxy, open on top.
   box(torso,body,-2.18,7.34,0,1.16,2.14,5.92);
   for(const sign of [-1,1]){
    box(torso,body,0,7.34,sign*2.48,5.20,2.14,1.16);
    box(torso,body,2.37,7.29,sign*1.28,1.18,2.06,2.25);
    // Raglan fabric wraps the top shoulder and returns slightly onto
    // the upper torso; no floating metal-like shoulder wedge.
    box(torso,wear,1.22,5.37,sign*5.80,3.70,1.13,2.65);
   }
   // Quarter-zip front edge and narrow knitted waist hem. The zipper
   // does not extend the entire torso like an outerwear placket.
   box(torso,trim,3.02,7.20,0,.13,1.82,.20);
   box(torso,trim,5.72,3.10,0,.10,2.40,.16);
   box(torso,body,5.58,-5.79,0,.16,.33,13.95);
  }else if(smock){
   foldedHood(torso,cloth);
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
   foldedHood(torso,mountainCanvas,true);
   // Gorka is mountain CLOTH, not an armor vest: broad contrasting
   // shoulder wear, simple central anorak placket, one shallow lower
   // cargo pouch and a plain cinched hem. No armor-looking vents or
   // stacked rectangular torso plates.
   for(const sign of [-1,1]){
    box(torso,body,.90,6.87,sign*3.20,5.00,.82,1.65);
    box(torso,wear,.18,4.58,sign*7.88,6.05,.85,.34);
   }
   box(torso,wear,6.30,1.22,0,.11,5.04,.18);
   box(torso,body,6.38,-4.56,0,.17,1.90,8.56);
   box(torso,gorkaCuff,6.36,-6.55,0,.18,.39,13.54);
  }
  const upper:THREE.Group[]=[],lower:THREE.Group[]=[],
   cuffedLower:THREE.Group[]=[],rolledUpper:THREE.Group[]=[];
  for(const [index,arm] of arms.entries()){
   // Both arms' local +X is outward after the IK segment alignment.
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
    // Bicep pouch is thin along the outward (+X) normal and broad
    // front-to-back; no lateral shard hangs off the front of the sleeve.
    const pouch=outwardLimbPocket(ru,.08,.34,2.35,.37);
    for(const part of [u,rolled]){
     box(part,wear,pouch.x,pouch.y,pouch.z,
      pouch.width,pouch.height,pouch.depth);
     box(part,trim,pouch.x+.24,pouch.y+.17,0,.10,.08,pouch.depth+.1);
    }
    const elbow=outwardLimbPatch(rl,-.02,.32,2.46,.13);
    box(l,wear,elbow.x,elbow.y,elbow.z,
     elbow.width,elbow.height,elbow.depth);
   }else if(smock){
    const armPatch=outwardLimbPatch(ru,.10,.29,2.26,.14);
    box(u,cloth,armPatch.x,armPatch.y,armPatch.z,
     armPatch.width,armPatch.height,armPatch.depth);
    tube(l,smockCuff,rl+.15,rl+.15,.15,.375);
   }else{
    const upperPatch=outwardLimbPatch(ru,.07,.40,2.60,.18);
    const elbowPatch=outwardLimbPatch(rl,-.22,.37,2.44,.16);
    box(u,wear,upperPatch.x,upperPatch.y,upperPatch.z,
     upperPatch.width,upperPatch.height,upperPatch.depth);
    box(l,wear,elbowPatch.x,elbowPatch.y,elbowPatch.z,
     elbowPatch.width,elbowPatch.height,elbowPatch.depth);
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
