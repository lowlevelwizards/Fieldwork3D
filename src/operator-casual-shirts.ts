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
   polo=cut==='polo-shirt';
  const torso=group(chest,'casual-shirt:'+cut);
  const contact=VISIBLE_UPPER_CONTACT[cut][0];
  const shell=block(torso,cloth,contact.x,contact.y,contact.z,
   contact.width,contact.height,contact.depth);
  shell.name='fieldwork-contact-shell-'+cut;
  shell.userData.armorContactShell=true;
  // A cut neckline must be an actual gap in the shirt, not a dark
  // decal over a solid rectangular chest. The contact box still describes
  // armor clearance, but the visible tee/polo/tank have split shoulders.
  if(tee||polo||cut==='tank-top'){
   shell.visible=false; // retain semantic contact proxy without rendering it
   shell.userData.garmentContactProxy=true;
   const tank=cut==='tank-top';
   const bodyY=tank?-1.28:-.91;
   const bodyHeight=tank?9.62:10.18;
   const bodyDepth=tank?13.20:14.20;
   block(torso,cloth,0,bodyY,0,10.28,bodyHeight,bodyDepth)
    .name=cut+':body';
   const shoulderZ=tank?5.18:4.78;
   const strapDepth=tank?2.30:4.54;
   const shoulderHeight=tank?2.75:2.18;
   for(const sign of [-1,1]){
    block(torso,cloth,0,tank?4.9:5.10,sign*shoulderZ,
     tank?9.75:10.24,shoulderHeight,strapDepth)
      .name=cut+':shoulder-'+sign;
   }
   // Bare throat is placed BEHIND the outer cloth but in front of the
   // inner body. Clear center gap remains visible from the front and back.
   block(torso,skin,5.155,tank?4.75:5.05,0,.24,
    tank?2.65:2.12,tank?7.65:5.35).name=cut+':neck-skin';
   if(tank){
    // The two narrow shoulder straps are continuous front-to-back. There
    // are no rigid sleeves, high shoulder pads or enclosed armholes.
    block(torso,cloth,5.21,3.57,0,.16,.24,8.85)
     .name='tank:scoop-neck-rim';
   }else{
    // Trim follows the neckline edge, rather than a floating slab laid
    // across both shoulders.
    block(torso,cloth,5.23,4.22,0,.20,.30,5.25)
     .name=cut+':neck-rib';
    if(polo){
     // Two small outward-folded collar leaves frame an OPEN front neck.
     // Keep both tips near the throat, not perched over shoulder seams.
     for(const sign of [-1,1]){
      const leaf=block(torso,cloth,5.30,5.43,sign*2.02,
       .40,.70,2.25);
      leaf.rotation.x=sign*.18;
      leaf.name='polo:folded-collar-'+sign;
      const point=block(torso,cloth,5.42,4.95,sign*1.25,
       .24,.67,.72);
      point.rotation.x=sign*.34;
      point.name='polo:collar-point-'+sign;
     }
     block(torso,cloth,5.28,3.79,0,.18,2.58,.52)
      .name='polo:short-placket';
     for(const y of [3.4,4.28])
      block(torso,trim,5.42,y,0,.10,.23,.23);
    }
   }
   block(torso,cloth,5.19,-5.76,0,.13,.21,
    tank?12.95:13.97).name=cut+':hem';
  }else if(button){
   // Compact folded collar, open throat and conventional full placket.
   // The previous tall 3.15-unit collar blocks read as shoulder epaulettes.
   block(torso,skin,5.27,6.08,0,.14,.55,2.5)
    .name='button-up:open-throat';
   for(const sign of [-1,1]){
    const leaf=block(torso,cloth,5.27,6.20,sign*1.73,
     .48,.73,2.72);
    leaf.rotation.x=sign*.16;
    leaf.name='button-up:collar-leaf-'+sign;
    const tip=block(torso,cloth,5.40,5.70,sign*1.34,
     .30,.54,.76);
    tip.rotation.x=sign*.28;
    tip.name='button-up:collar-tip-'+sign;
    block(torso,cloth,5.22,6.23,sign*4.62,.45,.18,3.08)
     .name='button-up:shoulder-seam-'+sign;
    block(torso,cloth,5.34,2.20,sign*3.25,.44,2.22,4.20);
    block(torso,cloth,5.60,3.41,sign*3.25,.17,.45,4.34);
   }
   block(torso,cloth,5.22,-.15,0,.20,11.0,.62);
   for(const y of [-4.65,-2.40,-.15,2.10,4.35])
    block(torso,trim,5.36,y,0,.11,.36,.36);
   block(torso,cloth,5.18,-5.66,0,.15,.33,14.22);
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
    block(u,cloth,0,-.325,0,4.18,.34,4.30)
     .name=cut+':short-sleeve';
    block(u,cloth,0,-.145,0,4.32,.08,4.44)
     .name=cut+':sleeve-hem';
   }else if(button){
    // The articulated base upper/lower meshes carry the textile; extra
    // geometry is only folded cuffs, never a rigid duplicate arm.
    block(l,cloth,0,.36,0,4.30,.25,4.45);
    // Proximal (-.5) is the elbow and distal (+.5) the wrist.
    // A cuff around -.16 reads as mid-forearm, not a wrist band.
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
