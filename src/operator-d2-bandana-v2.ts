/** D2-R5A: tied kerchief with a genuinely free-hanging triangular bib.
 * The band wraps the cheeks to the original rear knot; the triangle hangs
 * BELOW the 8x8 skull rather than ending against the chin. Deliberately
 * large stepped cloth masses, no little coplanar strips or cloth physics.
 */
import * as THREE from 'three';
import {clothExterior,type ClothCuboid} from './operator-d2-fitted-cloth.ts';
export type D2BandanaMode='raised'|'lowered';
const add=(p:ClothCuboid[],name:string,x:number,y:number,z:number,
 width:number,height:number,depth:number)=>{
 p.push({name,x,y,z,width,height,depth});
};
export function createD2BandanaMode(mode:D2BandanaMode,material:THREE.Material):THREE.Group{
 const root=new THREE.Group();root.name='d2-wrap-'+mode;
 root.userData.d2WrapMode=mode;
 const p:ClothCuboid[]=[];
 const raised=mode==='raised';
 const top=raised?3.18:-.68;
 const vertical=raised?1:.70;
 const lateral=raised?1:.90;
 const front=raised?-4.35:-3.80;
 const back=raised?4.14:3.66;
 const half=raised?4.10:3.69;
 // A distinct horizontal top fold anchors the fabric onto the cheeks.
 // It supports a broad hanging triangle rather than becoming the triangle.
 add(p,'wrap-band-front',0,top-.55,front,half*2+.08,1.18,.73);
 // Six large, vertically overlapping tiers create an actual lower kerchief
 // point; the last 2+ units sit BELOW canonical chin Y=-.65 when raised.
 // Later tiers project farther forward, free of the cubic face's front plane.
 const drop=[
  ['triangle-upper-anchor',1.04,2.16,7.70,.16,.80],
  ['triangle-upper-drop',2.05,3.22,6.48,.31,.87],
  ['triangle-middle-drop',3.10,4.40,4.98,.47,.93],
  ['triangle-lower-drop',4.27,5.61,3.43,.61,.96],
  ['triangle-tip',5.48,6.78,1.76,.75,.91]
 ] as const;
 for(const [name,a,b,width,project,depth] of drop){
  add(p,name,0,top-vertical*(a+b)/2,front-project,
   width*lateral,vertical*(b-a)+.16,depth);
 }
 // A generous upper perimeter turns the cloth around the squared cheeks
 // and meets the existing tie band at the rear. Lower cheek returns attach
 // to the *upper* triangle, then stop: no tube surrounds the free tip.
 for(const side of [-1,1]){
  const n=side<0?'left':'right';
  add(p,n+'-wrap-band',side*half,top-.63,(front+back)/2,
   .80,1.35,back-front+.34);
  add(p,n+'-cheek-transition',side*(half-.17),top-1.34*vertical,
   front+1.40,.90,2.28*vertical,3.75);
  add(p,n+'-triangular-shoulder',side*(half-.48),
   top-2.00*vertical,front-.13,1.17,1.78*vertical,1.22);
 }
 add(p,'closed-rear-landing',0,top-.64,back,half*2+.48,1.37,.75);
 // Preserve the successful heavy tied back: folded wings and unequal ends.
 const knotZ=back+.48,knotY=top-.67;
 add(p,'rear-knot',.05,knotY,knotZ,1.57,1.33,1.03);
 add(p,'knot-left-wing',-1.21,knotY+.10,knotZ-.02,1.64,.85,.63);
 add(p,'knot-right-wing',1.28,knotY+.02,knotZ-.04,1.71,.94,.67);
 add(p,'short-knot-tail',.59,knotY-.85,knotZ,.91,1.45,.53);
 add(p,'long-knot-tail',-.49,knotY-1.15,knotZ+.05,1.00,2.05,.59);
 root.add(clothExterior('free-hanging-tied-bandana-'+mode,p,material));
 return root;
}
