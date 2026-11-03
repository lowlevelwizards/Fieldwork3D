/** Stage 4: three genuinely new upper garments, not stretched BDU assets.
 * All cosmetic shells parent to the established torso and articulated bones.
 * No headgear geometry, IK transform, collision or weapon grip is modified.
 */
import * as THREE from 'three';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
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
   {y:4.5,front:5.94,back:-5.95,side:8.08},
   {y:-2.0,front:6.00,back:-5.98,side:7.85},
   {y:-6.55,front:6.07,back:-6.01,side:7.88},
   {y:-9.05,front:6.20,back:-6.09,side:8.13}] as readonly Ring[],
  collar:'folded hood with tall storm neck',pockets:'four large front and map',outer:true
 },
 'gorka-jacket':{
  rings:[{y:6.58,front:5.58,back:-5.77,side:7.38},
   {y:4.4,front:6.10,back:-6.10,side:8.07},
   {y:-1.9,front:6.10,back:-6.09,side:7.68},
   {y:-5.75,front:5.86,back:-5.86,side:7.35},
   {y:-7.75,front:5.94,back:-5.94,side:7.52}] as readonly Ring[],
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
 const g=new THREE.Group();g.name=name;g.visible=false;parent.add(g);
 g.userData.garmentMetricLength=parent.userData.garmentMetricLength??1;
 return g;
};
function box(g:THREE.Group,m:THREE.Material,
 x:number,y:number,z:number,w:number,h:number,d:number,rot=0){
 const metric=g.userData.garmentMetricLength as number||1;
 const mesh=new THREE.Mesh(garmentBoxUV(new THREE.BoxGeometry(w,h,d),
  w,h*metric,d,m,x,y*metric,z),m);
 mesh.position.set(x,y,z);mesh.rotation.x=rot;
 mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
 return mesh;
}
/** A recognisable, folded mountain hood. All parts intersect the jacket
 * neck/back; no floating rolls or thin antenna-like shoulder pieces. */
function foldedHood(g:THREE.Group,body:THREE.Material,
 reinforcement:THREE.Material,wide=false){
 const spread=wide?1.08:1;
 // Neck attachment and substantial collapsed crown behind the head.
 box(g,body,-5.18,6.35,0,2.35,2.05,8.75*spread);
 box(g,body,-6.20,8.05,0,2.90,3.15,7.30*spread);
 // Turned-in hood sides frame the collar without covering the face.
 for(const sign of [-1,1])
  box(g,body,-4.70,8.02,sign*3.10*spread,2.25,2.70,1.68);
 // Thick folded rim, and characteristic Gorka reinforced hood back.
 box(g,body,-5.82,9.66,0,2.80,.52,8.55*spread);
 if(reinforcement!==body)
  box(g,reinforcement,-7.63,8.18,0,.26,2.60,6.70*spread);
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
  // The base chest is already a complete clothed 10x12x14 block.
  // Outerwear gets at most one modest cover; the smock alone extends
  // over the belt line rather than widening every body part.
  if(combat)box(torso,body,0,0,0,10.22,12.22,14.22);
  else if(smock){
   // Looser outer layer; the real smock skirt reaches well below the belt.
   box(torso,body,0,0,0,11.18,12.52,15.05);
   box(torso,body,0,-8.05,0,11.64,4.28,15.35);
  }else{
   // One long, modestly oversized canvas shell: not a second armor plate.
   box(torso,body,0,-.98,0,11.45,15.70,15.10);
  }
  if(combat){
   // A SINGLE knit shell covers the torso front, sides and back. No
   // overlapping tan chest slab; the shell now encloses the hidden 10×12×14
   // base body so it cannot leak a second garment color at the waist.
   // Neck in this actual rig lives at chest-local (0,7,0), and is
   // 3.6 × 3.8 in plan. The collar hugs that neck rather than floating
   // at the extreme edges of the torso: compact, boxy, open on top.
   // The entire torso TOP is woven fabric. A single contiguous thin cap
   // replaces two disconnected shoulder stripes; the knit begins below
   // the shoulder seam and remains a clean contrasting body panel.
   box(torso,cloth,0,6.22,0,10.49,.36,14.48);
   // Upper side panels wrap from shoulder height down toward the armpit;
   // the back receives a modest same-fabric yoke.
   for(const side of [-1,1]){
    box(torso,cloth,0,4.62,side*7.16,10.30,3.18,.30);
    box(torso,cloth,5.19,5.30,side*5.06,.26,1.85,4.40);
   }
   box(torso,cloth,-5.20,5.48,0,.26,1.62,14.42);
   box(torso,cloth,-1.65,7.24,0,.95,1.75,5.60);
   for(const sign of [-1,1]){
    box(torso,cloth,0,7.24,sign*2.48,4.80,1.75,.95);
    box(torso,cloth,2.25,7.19,sign*1.28,.93,1.75,2.10);
    // Shallow stitched seam from the full yoke onto the upper sleeve.
    box(torso,cloth,1.22,5.34,sign*6.13,2.80,.27,2.25);
   }
   // Quarter-zip front edge and narrow knitted waist hem. The zipper
   // does not extend the entire torso like an outerwear placket.
   box(torso,trim,3.02,7.20,0,.13,1.82,.20);
   box(torso,trim,5.19,3.10,0,.10,2.40,.16);
   box(torso,body,5.16,-5.79,0,.15,.30,13.90);
  }else if(smock){
   foldedHood(torso,cloth,cloth);
   // Deep, attached box-bellows pockets. Bottom pair belongs to the
   // extended skirt, not to the base mannequin's chest cuboid.
   for(const sign of [-1,1]){
    const z=sign*3.65;
    for(const lower of [false,true]){
     const y=lower?-7.55:2.06,face=lower?5.82:5.59;
     const depth=lower?1.20:1.13,height=lower?3.32:3.02;
     box(torso,cloth,face+.42,y,z,depth,height,4.46);
     box(torso,smockCuff,face+depth*.92,y+height*.43,z,
      .26,.62,4.60);
    }
    box(torso,smockCuff,5.72,-2.64,sign*3.65,.18,.28,6.48);
   }
   box(torso,cloth,5.66,-.75,0,.18,12.50,.30);
   box(torso,smockCuff,5.91,-9.95,0,.22,.42,14.86);
  }else{
   foldedHood(torso,mountainCanvas,mountainPanel,true);
   // Gorka-3 signature: dark shoulder yoke, broad reinforced sleeves,
   // buttoned storm placket, slanted low pockets and gathered hem.
   // The patches sit on the canvas; none is a free-floating armor plate.
   for(const sign of [-1,1]){
    // Continuous shoulder panel, plus the visible yoke down the chest.
    box(torso,wear,.08,6.67,sign*5.04,10.85,.35,4.66);
    box(torso,wear,5.79,4.73,sign*4.60,.19,2.00,5.20);
    // Gorka's pair of slanted flap-covered waist pockets.
    const z=sign*3.82;
    box(torso,body,6.12,-3.85,z,1.02,2.78,4.56);
    box(torso,wear,6.66,-2.55,z,.24,.62,4.73,sign*.19);
   }
   box(torso,wear,5.79,4.71,0,.17,1.88,3.15);
   box(torso,gorkaCuff,5.80,-1.55,0,.20,10.70,.26);
   box(torso,gorkaCuff,5.83,-8.45,0,.17,.40,13.75);
  }
  const upper:THREE.Group[]=[],lower:THREE.Group[]=[],
   cuffedLower:THREE.Group[]=[],rolledUpper:THREE.Group[]=[];
  for(const [index,arm] of arms.entries()){
   // Both arms' local +X is outward after the IK segment alignment.
   const u=group(arm.upper,cut+':upper:'+index),
    l=group(arm.lower,cut+':lower:'+index),
    c=group(arm.lower,cut+':cuff:'+index),
    rolled=group(arm.upper,cut+':rolled:'+index);
   const ru=2.06,rl=1.80;
   // Existing articulated block arms are the fabric. Do not cover them
   // with oversized cylindrical sleeves or move the IK / contact bones.
   if(combat){
    box(c,cloth,0,-.14,0,3.87,.75,3.98);
    box(c,combatKnit,0,.216,0,5.02,.225,5.12);
    box(c,combatKnit,0,.079,0,4.73,.11,4.86);
    // Keep the upper arm FULL LENGTH. A short, broad double roll wraps
    // its elbow end at local +Y≈.5; skin-colored lower arm stays exposed.
    box(rolled,combatKnit,0,.405,0,5.29,.215,5.39);
    box(rolled,combatKnit,0,.267,0,4.91,.108,5.03);
    // Bicep pouch is thin along the outward (+X) normal and broad
    // front-to-back; no lateral shard hangs off the front of the sleeve.
    const pouch=outwardLimbPocket(ru,.07,.47,2.83,.73);
    // The rolled-sleeve group contains folds ONLY. No shoulder pocket
    // geometry may poke through the elbow roll at any pose.
    box(u,wear,pouch.x,pouch.y,pouch.z,
     pouch.width,pouch.height,pouch.depth);
    box(u,cloth,pouch.x+.40,pouch.y+.22,0,.22,.17,pouch.depth+.16);
    const elbow=outwardLimbPatch(rl,-.02,.32,2.46,.13);
    box(l,wear,elbow.x,elbow.y,elbow.z,
     elbow.width,elbow.height,elbow.depth);
   }else if(smock){
    // One unmistakable box-bellows shoulder pocket and thick flap.
    const pouch=outwardLimbPocket(ru,.06,.52,3.04,.80);
    box(u,cloth,pouch.x,pouch.y,pouch.z,
     pouch.width,pouch.height,pouch.depth);
    box(u,cloth,pouch.x+.45,pouch.y+.23,0,.24,.20,pouch.depth+.17);
    box(l,smockCuff,0,.350,0,4.82,.245,4.96);
    box(l,smockCuff,0,.204,0,4.53,.112,4.69);
    // Use the same abbreviated sleeve convention across all garments.
    box(c,cloth,0,-.14,0,3.95,.75,4.02);
    box(c,smockCuff,0,.215,0,5.14,.23,5.24);
    box(c,smockCuff,0,.077,0,4.78,.10,4.90);
    box(rolled,smockCuff,0,.405,0,5.37,.215,5.48);
    box(rolled,smockCuff,0,.267,0,5.00,.105,5.10);
   }else{
    const upperPatch=outwardLimbPocket(ru,.05,.54,3.14,.77);
    const elbowPatch=outwardLimbPatch(rl,-.13,.62,3.20,.30);
    box(u,wear,upperPatch.x,upperPatch.y,upperPatch.z,
     upperPatch.width,upperPatch.height,upperPatch.depth);
    box(u,wear,upperPatch.x+.43,upperPatch.y+.23,0,
     .21,.19,upperPatch.depth+.15);
    box(l,wear,elbowPatch.x,elbowPatch.y,elbowPatch.z,
     elbowPatch.width,elbowPatch.height,elbowPatch.depth);
    box(l,gorkaCuff,0,.35,0,4.88,.245,5.02);
    box(l,gorkaCuff,0,.204,0,4.55,.11,4.70);
    box(c,mountainCanvas,0,-.14,0,3.98,.75,4.06);
    box(c,gorkaCuff,0,.215,0,5.18,.23,5.28);
    box(c,gorkaCuff,0,.077,0,4.84,.105,4.94);
    box(rolled,gorkaCuff,0,.405,0,5.43,.22,5.55);
    box(rolled,gorkaCuff,0,.267,0,5.04,.11,5.16);
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
  const roll=sleeve==='rolled',cuff=sleeve==='cuffed';
  model.torso.visible=on;
  for(const g of model.upper)g.visible=on&&!roll;
  for(const g of model.lower)g.visible=on&&!roll&&!cuff;
  for(const g of model.cuffedLower)g.visible=on&&cuff;
  for(const g of model.rolledUpper)g.visible=on&&roll;
 }
}
