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
function foldedHood(g:THREE.Group,body:THREE.Material,
 wide=false){
 // Folded hood is ONE solid collapsed roll behind the neck. The old
 // separate side boxes looked like disconnected shoulder antennas.
 // A narrow, low roll stays behind the actual neck instead of exposing
 // two shoulder-level ends in the three-quarter garment silhouette.
 box(g,body,-5.25,6.56,0,1.38,1.18,wide?8.25:9.20);
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
   box(torso,body,0,0,0,10.92,12.34,14.75);
   box(torso,body,0,-7.10,0,11.18,3.15,14.95);
  }else box(torso,body,0,-.48,0,11.32,13.65,14.95);
  if(combat){
   // A SINGLE knit shell covers the torso front, sides and back. No
   // overlapping tan chest slab; the shell now encloses the hidden 10×12×14
   // base body so it cannot leak a second garment color at the waist.
   // Neck in this actual rig lives at chest-local (0,7,0), and is
   // 3.6 × 3.8 in plan. The collar hugs that neck rather than floating
   // at the extreme edges of the torso: compact, boxy, open on top.
   box(torso,body,-1.65,7.24,0,.95,1.75,5.60);
   for(const sign of [-1,1]){
    box(torso,body,0,7.24,sign*2.48,4.80,1.75,.95);
    box(torso,body,2.25,7.19,sign*1.28,.93,1.75,2.10);
    // Raglan fabric wraps the top shoulder and returns slightly onto
    // the upper torso; no floating metal-like shoulder wedge.
    box(torso,wear,1.22,5.36,sign*6.12,2.85,.45,2.12);
   }
   // Quarter-zip front edge and narrow knitted waist hem. The zipper
   // does not extend the entire torso like an outerwear placket.
   box(torso,trim,3.02,7.20,0,.13,1.82,.20);
   box(torso,trim,5.19,3.10,0,.10,2.40,.16);
   box(torso,body,5.16,-5.79,0,.15,.30,13.90);
  }else if(smock){
   foldedHood(torso,cloth);
   // Signature four-pocket field smock: larger rectangular cloth masses,
   // two on the chest and two below the waist. Flaps are narrow, visibly
   // separate folds, rather than a duplicate armor-looking front plate.
   for(const sign of [-1,1]){
    for(const y of [2.18,-7.02]){
     const z=sign*3.62;
     box(torso,cloth,5.59,y,z,.57,2.66,4.46);
     box(torso,smockCuff,5.88,y+1.16,z,.16,.44,4.62);
    }
    // Waist gather hugs the long field hem; both shoulder edges remain
    // lower than a ballistic shoulder fin.
    box(torso,smockCuff,5.55,-2.52,sign*3.72,.12,.20,6.10);
   }
   box(torso,cloth,5.52,-.66,0,.15,12.20,.25);
   box(torso,smockCuff,5.60,-8.43,0,.17,.26,14.50);
  }else{
   foldedHood(torso,mountainCanvas,true);
   // Iconic mountain suit: contrasting shoulder yokes return just onto
   // the chest, cloth gathers at the waist and simple reinforced forearms.
   // The short panels remain thin sewn fabric, NOT plate-like armor.
   for(const sign of [-1,1]){
    // One shoulder reinforcement per side is enough; the two extra
    // raised fabric bars above the neckline looked like floating handles.
    box(torso,wear,.20,4.64,sign*7.38,5.50,.65,.38);
    box(torso,wear,5.64,4.56,sign*5.77,.20,1.10,2.08);
   }
   box(torso,wear,5.70,1.13,0,.12,4.70,.17);
   box(torso,body,5.68,-4.82,0,.20,1.10,8.10);
   // Drawstring hem reads as a small dark band around a genuinely
   // tapered lower silhouette, not an overhanging jacket plate.
   box(torso,gorkaCuff,5.65,-7.05,0,.16,.30,13.45);
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
    box(c,cloth,0,-.16,0,3.65,.68,3.78);
    box(c,combatKnit,0,.20,0,3.85,.17,3.94);
    box(rolled,combatKnit,0,.23,0,4.12,.18,4.24);
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
    box(l,smockCuff,0,.38,0,3.64,.16,3.76);
   }else{
    const upperPatch=outwardLimbPatch(ru,.07,.40,2.60,.18);
    const elbowPatch=outwardLimbPatch(rl,-.22,.37,2.44,.16);
    box(u,wear,upperPatch.x,upperPatch.y,upperPatch.z,
     upperPatch.width,upperPatch.height,upperPatch.depth);
    box(l,wear,elbowPatch.x,elbowPatch.y,elbowPatch.z,
     elbowPatch.width,elbowPatch.height,elbowPatch.depth);
    box(l,gorkaCuff,0,.38,0,3.64,.18,3.76);
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
