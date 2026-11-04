/**
 * D2-F3: fitted stepped tubular neckwear. Modes use independent geometry,
 * not transforms of a tall rigid head box. All tube parts are exterior-joined.
 */
import * as THREE from 'three';
import {clothExterior,type ClothCuboid} from './operator-d2-fitted-cloth.ts';
export type D2GaiterMode='lowered'|'mouth'|'nose';
const add=(p:ClothCuboid[],name:string,x:number,y:number,z:number,w:number,h:number,d:number)=>{
 p.push({name,x,y,z,width:w,height:h,depth:d});
};
function ring(p:ClothCuboid[],name:string,bottom:number,top:number,
 halfWidth:number,frontZ:number,backZ:number){
 const y=(bottom+top)/2,h=top-bottom,t=.35;
 add(p,name+'-front',0,y,frontZ,halfWidth*2,h,t);
 add(p,name+'-back',0,y,backZ,halfWidth*2,h,t);
 add(p,name+'-left',-halfWidth,y,(frontZ+backZ)/2,t,h,backZ-frontZ);
 add(p,name+'-right',halfWidth,y,(frontZ+backZ)/2,t,h,backZ-frontZ);
}
export function createD2GaiterMode(mode:D2GaiterMode,material:THREE.Material):THREE.Group{
 const root=new THREE.Group();root.name='d2-wrap-'+mode;
 root.userData.d2WrapMode=mode;
 const parts:ClothCuboid[]=[];
 if(mode==='lowered'){
  // Gathered around the *neck*, not another square helmet.
  ring(parts,'gathered-neck',-2.88,-.79,3.52,-3.55,3.43);
  add(parts,'lowered-upper-cuff',0,-.91,-3.68,6.97,.46,.34);
  add(parts,'lowered-soft-fold',0,-1.67,-3.68,7.07,.44,.30);
  add(parts,'lowered-bottom-cuff',0,-2.57,-3.64,7.04,.50,.34);
 }else{
  const top=mode==='mouth'?1.82:3.34;
  ring(parts,'taut-face-tube',.22,top,4.08,-4.18,4.08);
  // Neck relaxes under the jaw instead of remaining a solid straight tube.
  ring(parts,'neck-gather',-2.84,.38,3.58,-3.69,3.55);
  add(parts,'nose-or-mouth-rim',0,top-.17,-4.34,7.45,.37,.30);
  add(parts,'first-neck-fold',0,-.71,-3.88,7.30,.50,.39);
  add(parts,'lower-neck-fold',0,-2.30,-3.83,7.26,.42,.31);
  if(mode==='nose'){
   // Strong single nasal projection; no extra floating stripe.
   add(parts,'nose-bridge-volume',0,2.95,-4.39,2.64,.58,.36);
  }
 }
 root.add(clothExterior('joined-gaiter-'+mode,parts,material));
 return root;
}
