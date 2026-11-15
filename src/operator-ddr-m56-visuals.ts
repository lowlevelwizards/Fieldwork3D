/** S1-A1: sparse period details aligned to the single stamped M56 shell.
 * Positioned in canonical -Z-forward head space. No shared M1 cover shape.
 */
import * as THREE from 'three';
import type {M56Options} from './operator-ddr-m56-policy.ts';
import {OPERATOR_SOLID_FAMILIES} from './operator-solid-color-families.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
export type M56Extras={rivets:THREE.Group;net:THREE.Group};
function part(g:THREE.Group,m:THREE.Material,x:number,y:number,z:number,
 w:number,h:number,d:number,name:string){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
 mesh.position.set(x,y,z);mesh.name=name;mesh.castShadow=true;
 g.add(mesh);
}
export function createM56Extras(parent:THREE.Group,dark:THREE.Material):M56Extras{
 const rivets=new THREE.Group();rivets.name='m56-earlier-liner-rivets';parent.add(rivets);
 // Early M56 used three exposed liner fasteners: one per side and one rear.
 // S1-A1B stations follow the revised sidewall, not buried inside its steel.
 // Later shell remains smooth when early-rivets is not selected.
 for(const side of [-1,1])
  part(rivets,dark,side*6.48,5.42,-1.85,.42,.42,.40,'m56-rivet-side');
 part(rivets,dark,0,5.39,7.63,.42,.42,.40,'m56-rivet-rear');
 const net=new THREE.Group();net.name='m56-period-coarse-net';parent.add(net);
 const cloth=new THREE.MeshStandardMaterial({
  color:OPERATOR_SOLID_FAMILIES['olive-drab'],roughness:.99,
  metalness:0,flatShading:true});
 // Legible open lattice instead of hundreds of coplanar pixel threads.
 for(const x of [-2.7,-.9,.9,2.7])
  part(net,cloth,x,8.83,.20,.35,.28,6.7,'m56-net-crown-longitudinal');
 for(const z of [-2.7,-.35,2.5])
  part(net,cloth,0,8.83,z,6.15,.28,.34,'m56-net-crown-transverse');
 for(const side of [-1,1]){
  // Follow the one-piece bell and integral flare; no nested-tier net rings.
  part(net,cloth,side*5.94,6.95,.15,.34,1.42,10.0,'m56-net-upper-side');
  part(net,cloth,side*6.37,5.58,.35,.34,1.20,12.3,'m56-net-mid-side');
  part(net,cloth,side*6.88,4.76,.65,.34,.34,14.70,'m56-net-flare-retainer');
 }
 // True forward/rearward shell extent, not hidden mid-bowl positions.
 part(net,cloth,0,4.80,-6.79,12.4,.33,.34,'m56-net-front-retainer');
 part(net,cloth,0,4.52,8.10,12.6,.33,.34,'m56-net-rear-retainer');
 consolidateVisualGroup(rivets);consolidateVisualGroup(net);
 rivets.visible=false;net.visible=false;return {rivets,net};
}
export function updateM56Extras(v:M56Extras,options:M56Options|undefined){
 v.rivets.visible=options?.m56Details==='early-rivets';
 v.net.visible=options?.m56Net==='coarse';
}
