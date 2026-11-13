/** Casual upper garments: four readable silhouettes on the existing animated rig.
 * All pieces are cosmetic; no new joints, grip sockets, hitboxes or equipment.
 * Flannel is an authored shirt-only textile, never a universal camouflage.
 */
import * as THREE from 'three';
import {garmentBoxUV} from './operator-fabric-camo-materials.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import {VISIBLE_UPPER_CONTACT} from './operator-garment-contact-surface.ts';
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
export function createCasualShirts(chest:THREE.Group,arms:readonly Arm[],
 cloth:THREE.MeshStandardMaterial,trim:THREE.MeshStandardMaterial,
 skin:THREE.MeshStandardMaterial):CasualShirts{
 const cuts={} as Record<CasualShirtCut,Prototype>;
 for(const cut of CASUAL_SHIRT_CUTS){
  const tee=cut==='t-shirt',button=cut==='button-up-shirt',
   polo=cut==='polo-shirt',tank=cut==='tank-top';
  const torso=group(chest,'casual-shirt:'+cut);
  const contact=VISIBLE_UPPER_CONTACT[cut][0];
  const shell=block(torso,cloth,contact.x,contact.y,contact.z,
   contact.width,contact.height,contact.depth);
  shell.name='fieldwork-contact-shell-'+cut;
  shell.userData.armorContactShell=true;
  // Independent lower hemlines distinguish tucked polo/button-up from a
  // relaxed tee. There is no floating overshirt, disconnected sleeve or
  // extra rig-sized chest pad.
  if(tee)block(torso,cloth,5.19,-5.66,0,.13,.38,14.0);
  if(button){
   // Full-length front placket, oversized collar tips, four recessed
   // button disks and two compact chest pockets.
   block(torso,cloth,5.22,-.15,0,.20,11.0,.62);
   for(const z of [-1,1]){
    block(torso,cloth,4.35,6.64,z*2.52,2.05,1.08,3.15);
    block(torso,cloth,5.34,2.20,z*3.25,.44,2.22,4.20);
    block(torso,cloth,5.60,3.41,z*3.25,.17,.45,4.34);
   }
   for(const y of [-4.65,-2.40,-.15,2.10,4.35])
    block(torso,trim,5.36,y,0,.11,.36,.36);
   block(torso,cloth,5.18,-5.66,0,.15,.33,14.22);
  }else if(polo){
   // Shallow open sport collar and two-button half placket.
   for(const sign of [-1,1])
    block(torso,cloth,4.52,6.55,sign*2.28,2.10,1.04,3.22);
   block(torso,cloth,5.18,4.32,0,.19,2.86,.55);
   for(const y of [3.72,4.70])
    block(torso,trim,5.34,y,0,.12,.27,.27);
   block(torso,cloth,5.17,-5.69,0,.15,.25,13.90);
  }else{
   // Sleeveless torso, exposed upper arms and low scoop neck; a small
   // skin inset at the front identifies the opening without cutting bones.
   block(torso,skin,5.22,5.72,0,.16,1.43,4.35);
   for(const sign of [-1,1]){
    block(torso,cloth,.12,6.22,sign*5.56,10.25,.20,3.0);
    block(torso,skin,0,4.95,sign*7.18,9.95,1.78,.16);
   }
   block(torso,cloth,5.18,-5.68,0,.13,.30,13.92);
  }
  const upper:THREE.Group[]=[],lower:THREE.Group[]=[],
   cuffedLower:THREE.Group[]=[],rolledUpper:THREE.Group[]=[];
  for(const [i,arm] of arms.entries()){
   const u=group(arm.upper,cut+':upper:'+i);
   const l=group(arm.lower,cut+':lower:'+i);
   const c=group(arm.lower,cut+':cuff:'+i);
   const roll=group(arm.upper,cut+':roll:'+i);
   if(tee||polo){
    // Upper-arm bone runs proximal(-.5) to elbow(+.5). Sleeve sits at
    // shoulder and only covers the proximal third of real skin.
    block(u,cloth,0,-.31,0,4.18,.40,4.30);
    block(u,cloth,0,-.105,0,4.43,.10,4.54);
   }else if(button){
    // The articulated base upper/lower meshes carry the textile; extra
    // geometry is only folded cuffs, never a rigid duplicate arm.
    block(l,cloth,0,.36,0,4.30,.25,4.45);
    block(c,cloth,0,.33,0,4.42,.33,4.54);
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
