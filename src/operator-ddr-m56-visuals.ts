/** R5H2: separately selectable external steel details and sparse helmet net.
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
 for(const side of [-1,1]){
  part(rivets,dark,side*5.96,5.76,-1.95,.42,.42,.40,'m56-rivet-forward');
  part(rivets,dark,side*6.06,5.48,3.25,.42,.42,.42,'m56-rivet-rear');
 }
 const net=new THREE.Group();net.name='m56-period-coarse-net';parent.add(net);
 const cloth=new THREE.MeshStandardMaterial({
  color:OPERATOR_SOLID_FAMILIES['olive-drab'],roughness:.99,
  metalness:0,flatShading:true});
 // Legible open lattice instead of hundreds of coplanar pixel threads.
 for(const x of [-3.2,-1.0,1.0,3.2])
  part(net,cloth,x,8.86,.20,.35,.28,9.2,'m56-net-crown-longitudinal');
 for(const z of [-3.2,-.35,2.6])
  part(net,cloth,0,8.87,z,8.8,.28,.34,'m56-net-crown-transverse');
 for(const side of [-1,1]){
  // Three width steps fit the authored crown/side/flare of DDR M56.
  // The old single x=5.48 strip was buried inside its broad lower shell.
  part(net,cloth,side*5.48,7.02,.15,.36,1.68,10.6,'m56-net-upper-side');
  part(net,cloth,side*6.44,5.78,.35,.35,1.55,12.3,'m56-net-mid-side');
  part(net,cloth,side*7.04,4.86,.65,.35,.43,14.70,'m56-net-flare-retainer');
 }
 // True forward/rearward shell extent, not hidden mid-bowl positions.
 part(net,cloth,0,5.00,-6.94,12.4,.33,.34,'m56-net-front-retainer');
 part(net,cloth,0,4.72,8.23,12.6,.33,.34,'m56-net-rear-retainer');
 consolidateVisualGroup(rivets);consolidateVisualGroup(net);
 rivets.visible=false;net.visible=false;return {rivets,net};
}
export function updateM56Extras(v:M56Extras,options:M56Options|undefined){
 v.rivets.visible=options?.m56Details==='early-rivets';
 v.net.visible=options?.m56Net==='coarse';
}
