/**
 * D2-F4: a folded triangular field scarf rather than a rigid cuboid collar.
 * Every mode has a real connected face, neck and cloth tail silhouette.
 */
import * as THREE from 'three';
import {clothExterior,fittedClothHood,addClothFrontRows,
 type ClothCuboid} from './operator-d2-fitted-cloth.ts';
export type D2ShemaghMode='draped'|'face-wrap'|'head-wrap';
function add(p:ClothCuboid[],name:string,x:number,y:number,z:number,w:number,h:number,d:number){
 p.push({name,x,y,z,width:w,height:h,depth:d});
}
/** Broad stepped triangle draped in front of the torso, not a square slab. */
function chestDrape(p:ClothCuboid[]){
 const rows=[
  [-2.20,-3.07,8.0],[-3.07,-4.01,7.3],
  [-4.01,-5.01,5.8],[-5.01,-5.92,4.25],
  [-5.92,-6.55,2.35]
 ];
 for(const [i,[upper,lower,w]] of rows.entries())
  add(p,'triangular-chest-drape-'+i,0,(upper+lower)/2,-4.22,
   w,upper-lower,.48);
 // One deliberately uneven free end falls down the wearer's right.
 add(p,'right-shoulder-fold',3.80,-3.09,-3.73,1.10,2.55,1.12);
 add(p,'right-hanging-tail',3.43,-4.94,-4.09,1.08,2.60,.60);
 add(p,'right-tail-taper',3.43,-6.50,-4.14,.70,.70,.56);
}
/** One compact, layered neck collar for all three wear modes. */
function collar(p:ClothCuboid[]){
 add(p,'neck-front',0,-1.51,-3.83,7.75,2.06,.52);
 add(p,'neck-back',0,-1.51,3.71,7.74,2.06,.46);
 for(const side of [-1,1])
  add(p,'neck-side',side*3.84,-1.46,0,.55,2.18,7.7);
 add(p,'upper-scarf-fold',0,-.69,-3.97,7.85,.58,.48);
 add(p,'lower-scarf-fold',-.44,-2.21,-4.06,7.65,.50,.50);
 chestDrape(p);
}
/** Tight, connected face band. Face remains visible above the nose bridge. */
function faceWrap(p:ClothCuboid[]){
 add(p,'covered-nose-and-mouth',0,1.06,-4.19,8.22,4.30,.42);
 add(p,'nose-fold',0,3.06,-4.33,3.10,.48,.46);
 for(const side of [-1,1])
  add(p,'cheek-wrap',side*4.14,1.17,0,.39,4.34,8.25);
 add(p,'occipital-wrap',0,1.13,4.12,8.25,4.27,.42);
}
function coveredHead(p:ClothCuboid[]){
 // The scarf actually goes over the crown and ears. Only an eye slit remains.
 // Headwrap uses a different cut from the balaclava for visual hierarchy.
 p.push(...fittedClothHood('shemagh-head').filter(part=>
  !part.name.includes('-neck-')&&!part.name.includes('-collar-')));
 addClothFrontRows(p,'shemagh-head',[
  {bottom:3.10,top:3.50,strips:[[-4.18,-3.20],[3.20,4.18]]},
  {bottom:3.50,top:4.76,strips:[[-4.18,-3.48],[3.48,4.18]]},
  {bottom:4.76,top:5.13,strips:[[-4.18,-3.14],[3.14,4.18]]},
  {bottom:5.13,top:7.30,strips:[[-4.18,4.18]]}
 ]);
 // Raised top fold that lies across the brow but not the eye opening.
 add(p,'head-top-fold',0,5.46,-4.36,7.88,.53,.30);
}
/** Modes are prepared once and toggled by visibility from Studio. */
export function createD2ShemaghMode(mode:D2ShemaghMode,material:THREE.Material):THREE.Group{
 const root=new THREE.Group();root.name='d2-wrap-'+mode;
 root.userData.d2WrapMode=mode;
 const parts:ClothCuboid[]=[];
 collar(parts);
 if(mode!=='draped')faceWrap(parts);
 if(mode==='head-wrap')coveredHead(parts);
 root.add(clothExterior('joined-shemagh-'+mode,parts,material));
 return root;
}
