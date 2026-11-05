/** D2-R4C: a pulled neck gaiter is one visibly continuous soft sleeve.
 * The outer face panel now reaches below the actual cube jaw before tapering
 * into its gathered neck. No exposed skin stripe between face and collar.
 */
import * as THREE from 'three';
import {clothExterior,type ClothCuboid} from './operator-d2-fitted-cloth.ts';
export type D2GaiterMode='lowered'|'mouth'|'nose';
const add=(p:ClothCuboid[],name:string,x:number,y:number,z:number,w:number,h:number,d:number)=>{
 p.push({name,x,y,z,width:w,height:h,depth:d});
};
function tube(p:ClothCuboid[],name:string,
 bottom:number,top:number,half:number,front:number,back:number,wall=.34){
 const center=(bottom+top)/2,height=top-bottom;
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
  tube(p,'lower-neck-tube',-2.89,-.73,3.47,-3.52,3.44);
  add(p,'rolled-upper-edge',0,-.74,-3.68,6.86,.37,.36);
  add(p,'one-gathered-fold',-.20,-2.14,-3.72,6.83,.43,.32);
  add(p,'right-neck-tuck',3.48,-1.88,-.35,.37,.66,5.30);
 }else{
  const top=mode==='mouth'?1.93:3.24;
  // Main sleeve stays outside the cube face until *below* the jaw, Y=-1.
  // The old sleeve stopped at +.17 and its narrow return disappeared inside
  // the skin head, producing a floating mouth/nose strip.
  tube(p,'continuous-pulled-tube',-1.39,top,4.08,-4.21,4.15);
  // Coarse overlapping landing gradually folds from head width to neck.
  // Its outer fronts overlap in depth; there is no planar/skin gap.
  tube(p,'tapered-neck-landing',-1.91,-.71,3.88,-4.00,3.96,.48);
  tube(p,'gathered-neck-tube',-2.94,-1.28,3.57,-3.79,3.72,.43);
  add(p,'continuous-upper-rim',0,top-.15,-4.40,7.93,.33,.34);
  add(p,'lower-neck-gather',-.12,-2.30,-3.95,7.03,.45,.42);
  if(mode==='nose')
   add(p,'subtle-nose-tension',0,top-.48,-4.44,2.20,.35,.29);
 }
 root.add(clothExterior('connected-sleeve-gaiter-'+mode,p,material));
 return root;
}
