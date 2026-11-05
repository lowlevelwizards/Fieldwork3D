/** D2-V3-A3b: shemagh = the BULKIEST folded field scarf.
 * Its three wearing states share a layered collar and a large asymmetrical
 * chest drape. Raised wrap is crossed crown folds, NOT a knit hood box.
 * Exterior geometry is authored once, fused, and toggled by visibility.
 */
import * as THREE from 'three';
import {clothExterior,type ClothCuboid} from './operator-d2-fitted-cloth.ts';
export type D2ShemaghMode='draped'|'face-wrap'|'head-wrap';
const add=(p:ClothCuboid[],name:string,x:number,y:number,z:number,w:number,h:number,d:number)=>{
 p.push({name,x,y,z,width:w,height:h,depth:d});
};
function collarAndBib(p:ClothCuboid[]){
 // Wide shoulder wrap, distinctly more voluminous than either the bandana
 // or the one-piece gaiter. Two broad folds are deliberately asymmetrical.
 add(p,'scarf-collar-front',0,-1.28,-3.98,8.48,2.53,.68);
 add(p,'scarf-collar-back',0,-1.31,3.81,8.42,2.57,.66);
 for(const side of [-1,1])
  add(p,'scarf-collar-side',side*4.14,-1.28,-.10,.68,2.62,7.95);
 add(p,'heavy-upper-fold',-.22,-.60,-4.26,8.44,.74,.49);
 add(p,'lower-shoulder-fold',.48,-2.25,-4.19,8.22,.66,.56);
 // Thick, tapered triangle with deliberate broad stepped silhouette.
 const bands=[
  [-2.30,-3.29,8.58],[-3.29,-4.20,7.28],
  [-4.20,-5.20,5.61],[-5.20,-6.10,3.76],
  [-6.10,-6.96,1.84]
 ] as const;
 for(const [i,[upper,lower,width]] of bands.entries())
  add(p,'broad-triangular-chest-bib-'+i,0,(upper+lower)/2,
   -4.19-.025*i,width,upper-lower,.58);
 // Heavier and asymmetrical, with one clearly free side panel.
 add(p,'right-shoulder-drape',4.03,-3.15,-3.89,1.55,2.40,1.08);
 add(p,'right-hanging-scarf-tail',3.72,-5.26,-4.20,1.21,2.80,.72);
 add(p,'right-tail-point',3.72,-7.04,-4.23,.70,.77,.57);
 add(p,'left-tucked-shoulder',-3.95,-2.87,-3.85,.90,1.11,.71);
}
function joinedFaceWrap(p:ClothCuboid[]){
 // A stepped diagonal crossover covers nose and lower face. Offset rows
 // and raised shoulder folds distinguish it from a level gaiter tube.
 const rows=[
  [-.49,.24,8.46,-.06],[.24,1.08,8.25,-.25],
  [1.08,1.88,7.90,-.07],[1.88,2.58,7.41,.18],
  [2.58,3.13,6.66,.43]
 ] as const;
 for(const [i,[low,high,width,x]] of rows.entries())
  add(p,'diagonal-face-wrap-'+i,x,(low+high)/2,
   -4.22-.034*i,width,high-low,.45);
 add(p,'raised-nose-overlap',.51,2.80,-4.43,3.48,.41,.36);
 for(const side of [-1,1])
  add(p,'wraparound-cheek-side',side*4.13,1.32,.02,
   .47,3.66,8.07);
 add(p,'wraparound-rear',0,1.31,4.05,8.20,3.69,.48);
 add(p,'left-tucked-face-fold',-3.86,2.33,-4.19,.83,1.04,.45);
}
function crownWindings(p:ClothCuboid[]){
 // No full balaclava front shell. Wide crown bands cross and step
 // forward/sideward. Skin remains visible across the eye window.
 add(p,'draped-crown-top',0,7.25,0,8.65,.49,8.65);
 add(p,'first-crown-winding',-.29,6.56,-4.29,8.71,.96,.48);
 add(p,'second-crown-winding',.34,5.77,-4.49,8.61,.79,.43);
 add(p,'wrapped-brow-ridge',-.17,5.20,-4.58,8.45,.42,.40);
 for(const side of [-1,1]){
  add(p,'crown-side-turn',side*4.23,5.77,.05,.50,2.99,8.53);
  add(p,'crown-rear-band',side*2.14,5.66,4.24,4.22,2.20,.49);
 }
 add(p,'rear-wrap-knot',-3.53,4.77,4.48,1.30,1.32,1.16);
 add(p,'long-rear-head-wrap-tail',-3.60,1.77,4.45,1.35,5.10,.80);
 add(p,'short-rear-head-wrap-tail',-2.54,3.36,4.40,1.01,2.13,.59);
}
export function createD2ShemaghMode(mode:D2ShemaghMode,material:THREE.Material):THREE.Group{
 const root=new THREE.Group();root.name='d2-wrap-'+mode;
 root.userData.d2WrapMode=mode;
 const parts:ClothCuboid[]=[];
 collarAndBib(parts);
 if(mode!=='draped')joinedFaceWrap(parts);
 if(mode==='head-wrap')crownWindings(parts);
 root.add(clothExterior('layered-shemagh-'+mode,parts,material));
 return root;
}
