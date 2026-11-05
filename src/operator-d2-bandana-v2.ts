/** D2-R4B: bandana as a joined, substantial three-dimensional tied kerchief.
 * Broad, face-following cloth wraps the cheeks and closes at a heavy rear knot.
 * Separate raised/lowered geometries are constructed once and toggled only.
 */
import * as THREE from 'three';
import {clothExterior,type ClothCuboid} from './operator-d2-fitted-cloth.ts';
export type D2BandanaMode='raised'|'lowered';
const add=(parts:ClothCuboid[],name:string,x:number,y:number,z:number,
 width:number,height:number,depth:number)=>{
 parts.push({name,x,y,z,width,height,depth});
};
export function createD2BandanaMode(mode:D2BandanaMode,material:THREE.Material):THREE.Group{
 const root=new THREE.Group();root.name='d2-wrap-'+mode;
 root.userData.d2WrapMode=mode;
 const p:ClothCuboid[]=[];
 const raised=mode==='raised';
 const top=raised?3.23:-.72;
 const front=raised?-4.34:-3.78;
 const back=raised?4.13:3.67;
 const half=raised?4.12:3.65;
 // Wide stepped hanging fabric, not an almost planar Dorito or a rigid cowl.
 // Each adjacent band slightly overlaps so the union has no disconnected edges.
 const bands=[
  [0,.55,8.08],[.55,1.25,7.90],[1.25,2.03,7.12],
  [2.03,2.76,5.86],[2.76,3.45,4.42],[3.45,3.98,3.24]
 ] as const;
 for(const [i,[from,to,width]] of bands.entries()){
  add(p,'hanging-front-'+i,0,top-(from+to)/2,
   front-.025*i,width,to-from+.12,.54);
 }
 // One thick upper fold reads as textile, with no extra strip hovering over it.
 add(p,'wide-folded-top-edge',0,top-.22,front-.17,8.23,.47,.43);
 // Upper wings wrap continuously from the cheeks to the back of the head.
 // The middle/lower returns widen the side silhouette instead of exposing
 // two skinny straps flanking a triangular sheet.
 for(const side of [-1,1]){
  const name=side<0?'left':'right',x=side*half;
  add(p,name+'-upper-wrap',x,top-.56,(front+back)/2,
   .63,1.19,back-front+.32);
  add(p,name+'-cheek-wrap',x,top-1.48,-1.01,
   .67,1.89,6.89);
  add(p,name+'-lower-cheek-return',side*(half-.18),top-2.33,-2.47,
   .73,1.79,3.82);
  add(p,name+'-front-corner-fold',side*(half-.36),top-1.41,
   front+.38,1.08,1.45,1.16);
 }
 // Rear band joins both side wings before the separate, oversized knot.
 add(p,'closed-rear-landing',0,top-.59,back,half*2+.38,1.20,.56);
 const knotZ=back+.48,knotY=top-.64;
 add(p,'rear-knot',.05,knotY,knotZ,1.57,1.33,1.03);
 add(p,'knot-left-wing',-1.21,knotY+.10,knotZ-.02,1.64,.85,.63);
 add(p,'knot-right-wing',1.28,knotY+.02,knotZ-.04,1.71,.94,.67);
 add(p,'short-knot-tail',.59,knotY-.85,knotZ,.91,1.45,.53);
 add(p,'long-knot-tail',-.49,knotY-1.15,knotZ+.05,1.00,2.05,.59);
 root.add(clothExterior('joined-tied-bandana-'+mode,p,material));
 return root;
}
