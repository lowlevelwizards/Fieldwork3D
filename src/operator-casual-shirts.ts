/** Four lightweight casual tops share the EXISTING animated torso.
 * No duplicate chest shell, skin cutout, shoulder pads or structural fit changes.
 * Shirt identity comes from tiny collar/placket details and the real arm bones.
 */
import * as THREE from 'three';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import type {SleeveState} from './operator-wardrobe-data.ts';

export const CASUAL_SHIRT_CUTS=['t-shirt','button-up-shirt','polo-shirt','tank-top'] as const;
export type CasualShirtCut=typeof CASUAL_SHIRT_CUTS[number];
export const isCasualShirtCut=(id:string):id is CasualShirtCut=>
 (CASUAL_SHIRT_CUTS as readonly string[]).includes(id);
type Arm={upper:THREE.Mesh;lower:THREE.Mesh};
type Prototype={torso:THREE.Group;upper:THREE.Group[];lower:THREE.Group[];
 cuffedLower:THREE.Group[];rolledUpper:THREE.Group[]};
export type CasualShirts={cuts:Record<CasualShirtCut,Prototype>};
const group=(parent:THREE.Object3D,name:string)=>{
 const g=new THREE.Group();g.name=name;g.visible=false;parent.add(g);
 g.userData.garmentMetricLength=parent.userData.garmentMetricLength??1;
 return g;
};
function block(g:THREE.Group,mat:THREE.Material,
 x:number,y:number,z:number,w:number,h:number,d:number){
 const length=(g.userData.garmentMetricLength as number)||1;
 const mesh=new THREE.Mesh(garmentBoxUV(new THREE.BoxGeometry(w,h,d),
  w,h*length,d,mat,x,y*length,z),mat);
 mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
 g.add(mesh);return mesh;
}
/** No large mesh on the chest: the already-present baseTorso is the body
 * for all four cuts and already receives the selected solid/camo/flannel.
 * The tiny surface details below never project beyond the original torso.
 */
export function createCasualShirts(chest:THREE.Group,arms:readonly Arm[],
 cloth:THREE.MeshStandardMaterial,trim:THREE.MeshStandardMaterial):CasualShirts{
 const cuts={} as Record<CasualShirtCut,Prototype>;
 for(const cut of CASUAL_SHIRT_CUTS){
  const tee=cut==='t-shirt',button=cut==='button-up-shirt',
   polo=cut==='polo-shirt';
  const torso=group(chest,'casual-shirt:'+cut);
  if(tee){
   // Two unobtrusive neck-edge stitches on the existing chest block.
   for(const sign of [-1,1])
    block(torso,trim,5.035,5.75,sign*1.24,.07,.10,1.32)
     .name='tee:crew-neck-seam';
  }else if(polo){
   // Two short, flat collar leaves near the neck. No epaulettes or
   // projected neckline cutout that would hide the original torso.
   for(const sign of [-1,1])
    block(torso,cloth,5.055,5.75,sign*1.38,.15,.46,1.62)
     .name='polo:collar-leaf';
   block(torso,cloth,5.06,4.72,0,.15,1.28,.37)
    .name='polo:short-placket';
   for(const y of [4.45,4.9])
    block(torso,trim,5.15,y,0,.10,.16,.16)
     .name='polo:button';
  }else if(button){
   // Preserve the button-up silhouette with thin details ON the torso,
   // not a second oversized jacket-shaped chest.
   for(const sign of [-1,1]){
    block(torso,cloth,5.06,5.76,sign*1.43,.15,.46,1.76)
     .name='button-up:flat-collar';
    block(torso,cloth,5.08,2.18,sign*3.17,.16,1.86,3.14)
     .name='button-up:chest-pocket';
    block(torso,cloth,5.16,3.17,sign*3.17,.16,.18,3.23)
     .name='button-up:pocket-flap';
   }
   block(torso,cloth,5.09,-.11,0,.17,10.9,.46)
    .name='button-up:placket';
   for(const y of [-4.5,-2.35,-.2,1.95,4.1])
    block(torso,trim,5.20,y,0,.10,.25,.23)
     .name='button-up:button';
  }
  // Tank top: zero added torso geometry. Bare arms plus the original
  // torso are clearer than fake skin plaques and disconnected straps.
  const upper:THREE.Group[]=[],lower:THREE.Group[]=[],
   cuffedLower:THREE.Group[]=[],rolledUpper:THREE.Group[]=[];
  for(const [i,arm] of arms.entries()){
   const u=group(arm.upper,cut+':upper:'+i);
   const l=group(arm.lower,cut+':lower:'+i);
   const c=group(arm.lower,cut+':cuff:'+i);
   const roll=group(arm.upper,cut+':roll:'+i);
   if(tee||polo){
    // ONE thin sleeve on the proximal section of the real skin arm.
    // At the existing arm dimensions (3.9 x 4.0) this is barely larger
    // than the limb, unlike the old bulky stacked sleeve + armor cuff.
    block(u,cloth,0,-.29,0,3.98,.42,4.08)
     .name=cut+':short-sleeve';
   }else if(button){
    // Reuse the original articulated cloth sleeves and existing fabric
    // cuffs; none of this creates another upper-arm or chest shell.
    block(l,cloth,0,.36,0,4.30,.25,4.45);
    block(c,cloth,0,-.16,0,4.42,.29,4.54)
     .name='button-up:mid-forearm-cuff';
    block(roll,cloth,0,.37,0,4.62,.27,4.76);
    block(roll,cloth,0,.215,0,4.40,.12,4.52);
   }
   for(const g of [u,l,c,roll])consolidateVisualGroup(g);
   upper.push(u);lower.push(l);cuffedLower.push(c);rolledUpper.push(roll);
  }
  consolidateVisualGroup(torso);
  cuts[cut]={torso,upper,lower,cuffedLower,rolledUpper};
 }
 return {cuts};
}
export function updateCasualShirts(models:CasualShirts,top:string,sleeve:SleeveState){
 for(const cut of CASUAL_SHIRT_CUTS){
  const on=cut===top,m=models.cuts[cut],button=cut==='button-up-shirt';
  m.torso.visible=on;
  for(const g of m.upper)g.visible=on&&(cut==='t-shirt'||cut==='polo-shirt');
  for(const g of m.lower)g.visible=on&&button&&sleeve==='unrolled';
  for(const g of m.cuffedLower)g.visible=on&&button&&sleeve==='cuffed';
  for(const g of m.rolledUpper)g.visible=on&&button&&sleeve==='rolled';
 }
}
