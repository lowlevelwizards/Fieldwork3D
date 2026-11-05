/** R16-R20: deliberately opaque, simplified D2 protective mask factory.
 * Keep original saved IDs and wardrobe-facing import paths stable.
 */
import * as THREE from 'three';
import type {MaskMaterials} from './operator-d2-mask-geometry.ts';
import {buildSimpleM40,buildSimpleM50} from './operator-d2-simple-mask-pilots.ts';
import {buildSimpleGp5,buildSimpleM17} from './operator-d2-simple-mask-full.ts';
import {buildSimpleTactical,buildSimpleIndustrial}
 from './operator-d2-simple-mask-half.ts';
export type D2MaskId=
 'half-mask'|'respirator-half'|'gas-gp5'|'gas-m17'|'gas-m40'|'gas-m50';
export type D2MaskMaterials=MaskMaterials;
export function createD2Mask(id:D2MaskId,m:D2MaskMaterials):THREE.Group{
 const root=new THREE.Group();root.name='d2-'+id;
 root.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 root.userData.rebuild='D2-R';
 root.userData.simpleShellRevision='R16-R20';
 if(id==='half-mask'||id==='respirator-half'){
  const modes=id==='half-mask'
   ?['solid','mesh']:['twin-filter','compact-filter'];
  for(const mode of modes){
   const sub=new THREE.Group();sub.name=id+'-'+mode;
   sub.userData.d2MaskMode=mode;
   sub.visible=mode===modes[0];
   if(id==='half-mask')buildSimpleTactical(sub,m,mode==='mesh');
   else buildSimpleIndustrial(sub,m,mode==='compact-filter');
   root.add(sub);
  }
 }else if(id==='gas-gp5')buildSimpleGp5(root,m);
 else if(id==='gas-m17')buildSimpleM17(root,m);
 else if(id==='gas-m40')buildSimpleM40(root,m);
 else buildSimpleM50(root,m);
 return root;
}
