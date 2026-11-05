/** D2-V3-A2: one soft tubular silhouette, not a stack of face bands.
 * Lowered = gathered collar; mouth/nose = the SAME extended sleeve
 * at different upper heights. No triangles, knots, layered tails.
 * Every mode is built once and selected by visibility only.
 */
import * as THREE from 'three';
import {clothExterior,type ClothCuboid} from './operator-d2-fitted-cloth.ts';
export type D2GaiterMode='lowered'|'mouth'|'nose';
const add=(p:ClothCuboid[],name:string,x:number,y:number,z:number,w:number,h:number,d:number)=>{
 p.push({name,x,y,z,width:w,height:h,depth:d});
};
function tube(p:ClothCuboid[],name:string,
 bottom:number,top:number,half:number,front:number,back:number){
 const center=(bottom+top)/2,height=top-bottom,wall=.32;
 add(p,name+'-front',0,center,front,half*2,height,wall);
 add(p,name+'-back',0,center,back,half*2,height,wall);
 for(const side of [-1,1])
  add(p,name+'-side',side*half,center,(front+back)/2,
   wall,height,back-front);
}
export function createD2GaiterMode(mode:D2GaiterMode,material:THREE.Material):THREE.Group{
 const root=new THREE.Group();root.name='d2-wrap-'+mode;
 root.userData.d2WrapMode=mode;
 const p:ClothCuboid[]=[];
 if(mode==='lowered'){
  // A compressed, uneven tube clearly BELOW the face.
  tube(p,'lower-neck-tube',-2.89,-.73,3.47,-3.52,3.44);
  add(p,'rolled-upper-edge',0,-.74,-3.68,6.86,.37,.36);
  add(p,'one-gathered-fold',-.20,-2.14,-3.72,6.83,.43,.32);
  // Small side tuck in place of horizontal floating decorative stripes.
  add(p,'right-neck-tuck',3.48,-1.88,-.35,.37,.66,5.30);
 }else{
  const top=mode==='mouth'?1.93:3.24;
  // Long, uninterrupted sleeve. No scarves or overlapping horizontal bands.
  tube(p,'one-pulled-tube',.17,top,4.06,-4.17,4.06);
  tube(p,'soft-neck-return',-2.82,.43,3.55,-3.64,3.55);
  // One continuous tapered landing between larger face and narrower neck.
  add(p,'front-tube-landing',0,.29,-3.93,7.79,.49,.63);
  add(p,'rear-tube-landing',0,.29,3.80,7.78,.49,.68);
  for(const side of [-1,1])
   add(p,'side-tube-landing',side*3.81,.29,0,.62,.49,7.85);
  // Only ONE visible raised upper hem; it remains joined to the main tube.
  add(p,'continuous-upper-rim',0,top-.15,-4.33,7.82,.30,.27);
  add(p,'lower-neck-gather',-.17,-2.22,-3.75,6.94,.38,.35);
  if(mode==='nose')
   add(p,'subtle-nose-tension',0,top-.47,-4.33,2.18,.35,.28);
 }
 root.add(clothExterior('single-sleeve-gaiter-'+mode,p,material));
 return root;
}
