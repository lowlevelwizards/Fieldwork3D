/** D2-V3-A3a: bandana = LIGHT TIED TRIANGLE, not a narrow neck tube.
 * The rear knot, two unequal tails and pointed front remain readable
 * from three-quarter and side views. Still one joined exterior mesh/mode.
 */
import * as THREE from 'three';
import {clothExterior,type ClothCuboid} from './operator-d2-fitted-cloth.ts';
export type D2BandanaMode='raised'|'lowered';
const add=(p:ClothCuboid[],name:string,x:number,y:number,z:number,w:number,h:number,d:number)=>{
 p.push({name,x,y,z,width:w,height:h,depth:d});
};
export function createD2BandanaMode(mode:D2BandanaMode,material:THREE.Material):THREE.Group{
 const root=new THREE.Group();root.name='d2-wrap-'+mode;
 root.userData.d2WrapMode=mode;
 const p:ClothCuboid[]=[];
 const raised=mode==='raised';
 const top=raised?3.16:-.46;
 const frontZ=raised?-4.24:-3.73;
 // Five deliberately coarse steps create a triangular kerchief, not
 // a flat face strap. Width halves toward the bottommost cloth point.
 const steps=[
  [0,.43,7.75],[.43,1.00,6.62],[1.00,1.61,5.16],
  [1.61,2.23,3.43],[2.23,2.84,1.67]
 ] as const;
 for(const [i,[from,to,width]] of steps.entries())
  add(p,'tapered-triangle-'+i,0,top-(from+to)/2,
   frontZ-.035*i,width,to-from,.32);
 // A single bound hem at the top. Neither a thick scarf cowl
 // nor the stack of parallel face stripes from the previous model.
 add(p,'folded-upper-hem',0,top-.13,frontZ-.16,7.79,.28,.26);
 const half=raised?3.97:3.59;
 const rear=raised?4.04:3.56;
 const tieY=top-.31;
 for(const side of [-1,1]){
  add(p,'tied-side',side*half,tieY,
   (frontZ+rear)/2,.37,.54,rear-frontZ);
  add(p,'corner-crease',side*3.41,tieY-.21,frontZ-.09,
   .75,.55,.34);
 }
 add(p,'rear-tie-band',0,tieY,rear,half*2,.52,.38);
 // Strong three-quarter signature: knot, two bow wings and unequal tails.
 add(p,'rear-knot',.10,tieY-.10,rear+.30,1.25,1.08,.94);
 add(p,'knot-left-wing',-1.12,tieY+.05,rear+.32,1.41,.62,.46);
 add(p,'knot-right-wing',1.31,tieY-.03,rear+.32,1.45,.65,.48);
 add(p,'short-knot-tail',1.02,tieY-.94,rear+.29,.78,1.22,.36);
 add(p,'long-knot-tail',-.47,tieY-1.22,rear+.28,.82,1.74,.40);
 root.add(clothExterior('single-tied-bandana-'+mode,p,material));
 return root;
}
