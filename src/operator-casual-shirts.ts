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
  // The original torso front is X=+5, its top Y=+6. The previous
  // 5.055-X thin overlays penetrated that face, leaving flickering strips
  // at the neckline. All decorative FRONT faces now sit well clear of
  // X=5; only the actual baseTorso owns the shirt body.
  if(polo){
   for(const sign of [-1,1])
    block(torso,cloth,5.35,5.70,sign*1.92,.34,.94,2.55)
     .name='polo:collar-leaf';
   block(torso,cloth,5.33,4.67,0,.32,2.18,.72)
    .name='polo:short-placket';
   for(const y of [4.16,5.01])
    block(torso,trim,5.57,y,0,.23,.38,.40)
     .name='polo:button';
  }else if(button){
   // Exaggerated, recognizable shirt features; all share the existing
   // torso textile and never add another box-sized jacket shell.
   for(const sign of [-1,1]){
    block(torso,cloth,5.34,5.71,sign*1.93,.35,.94,2.65)
     .name='button-up:folded-collar';
    block(torso,cloth,5.33,2.12,sign*3.23,.35,2.46,3.75)
     .name='button-up:chest-pocket';
    block(torso,cloth,5.57,3.43,sign*3.23,.22,.45,3.90)
     .name='button-up:pocket-flap';
   }
   block(torso,cloth,5.30,-.10,0,.31,10.83,.85)
    .name='button-up:placket';
   for(const y of [-4.5,-2.3,-.1,2.1,4.3])
    block(torso,trim,5.57,y,0,.24,.46,.45)
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
    // Both short sleeves follow the real upper-arm bone. About 10–20%
    // more readable than the previous thin shell, but still not a pad.
    block(u,cloth,0,-.252,0,4.25,.50,4.37)
     .name=cut+':short-sleeve';
    if(polo){
     // A shallow, slightly proud band at the DISTAL sleeve edge.
     // Smaller cross-section would disappear at gameplay zoom.
     block(u,cloth,0,-.025,0,4.39,.095,4.51)
      .name='polo:sleeve-hem';
    }
   }else if(button){
    // A true tropical short sleeve, anchored to the animated upper arm;
    // unlike a rolled cuff it has one clean edge and a bare elbow.
    block(u,cloth,0,-.25,0,4.24,.50,4.36)
     .name='button-up:tropical-short-sleeve';
    // Cuffed: a SINGLE cloth forearm sleeve with ONE terminal band.
    // Lower-bone normalized Y runs -0.5 (elbow) to +0.5 (wrist).
    // Previous separate "elbow join" and mid-forearm ring read as
    // duplicate cuffs. Extend the fabric smoothly down to Y=+.34,
    // then finish it once, close to the wrist, leaving a short skin gap.
    // The underlying articulated lower arm remains skin so movement,
    // bends and the uncovered wrist all continue to render normally.
    block(c,cloth,0,-.08,0,3.87,.84,3.98)
     .name='button-up:cuffed-forearm-sleeve';
    block(c,cloth,0,.31,0,4.12,.10,4.23)
     .name='button-up:wrist-cuff';
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
  for(const g of m.upper)g.visible=on&&(cut==='t-shirt'||cut==='polo-shirt'||
   (button&&sleeve==='short'));
  for(const g of m.lower)g.visible=on&&button&&sleeve==='unrolled';
  for(const g of m.cuffedLower)g.visible=on&&button&&sleeve==='cuffed';
  for(const g of m.rolledUpper)g.visible=on&&button&&sleeve==='rolled';
 }
}
