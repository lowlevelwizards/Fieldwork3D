/**
 * D2-F4: a tied triangular bandana, not a square collar or parallel slabs.
 * Each front row progressively narrows into a central downward point.
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
 const top=raised?3.18:-.43;
 const frontZ=raised?-4.24:-3.72;
 // A wide upper hem and large triangular front: one cloth silhouette.
 const rows=[
  [0,.54,7.82],[.54,1.24,7.22],[1.24,1.94,5.76],
  [1.94,2.66,4.12],[2.66,3.32,2.64]
 ] as const;
 for(const [i,[from,to,width]] of rows.entries()){
  add(p,'triangle-'+i,0,top-(from+to)/2,frontZ-.02*i,
   width,to-from,.44);
 }
 // Connected side tie bands are fitted around the uncovered head/neck.
 const half=raised?4.05:3.62;
 const rear=raised?4.07:3.49;
 const tieY=top-.32;
 for(const side of [-1,1]){
  add(p,'tied-cloth-side',side*half,tieY,
   (frontZ+rear)/2,.37,.53,rear-frontZ);
  add(p,'diagonal-cheek-fold',side*3.38,tieY-.23,frontZ-.08,
   .84,.61,.45);
 }
 add(p,'tied-cloth-rear',0,tieY,rear,half*2,.56,.42);
 add(p,'rear-knot',.25,tieY-.07,rear+.31,1.25,.95,.92);
 add(p,'short-rear-tail',1.02,tieY-.87,rear+.29,.76,1.35,.42);
 add(p,'long-rear-tail',-.36,tieY-1.24,rear+.35,.82,2.09,.40);
 root.add(clothExterior('joined-bandana-'+mode,p,material));
 return root;
}
