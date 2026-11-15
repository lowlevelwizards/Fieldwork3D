/** S1-A1: sparse period details aligned to the single stamped M56 shell.
 * Positioned in canonical -Z-forward head space. No shared M1 cover shape.
 */
import * as THREE from 'three';
import type {M56Options} from './operator-ddr-m56-policy.ts';
import {OPERATOR_SOLID_FAMILIES} from './operator-solid-color-families.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
import {M56_PERIMETER,m56SurfacePoint} from './operator-m56-unified-shell.ts';
export type M56Extras={rivets:THREE.Group;net:THREE.Group};
function part(g:THREE.Group,m:THREE.Material,x:number,y:number,z:number,
 w:number,h:number,d:number,name:string){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
 mesh.position.set(x,y,z);mesh.name=name;mesh.castShadow=true;
 g.add(mesh);
}
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
function netLine(g:THREE.Group,mat:THREE.Material,
 a:readonly number[],b:readonly number[]){
 // Cached one-time build; merged with the other optional net details.
 const p=new THREE.Vector3(a[0],a[1]+.11,a[2]),
  q=new THREE.Vector3(b[0],b[1]+.11,b[2]);
 const delta=q.clone().sub(p);
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(.24,delta.length(),.24),mat);
 mesh.position.copy(p.add(q).multiplyScalar(.5));
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
 mesh.name='m56-net-contoured-retainer';mesh.castShadow=true;g.add(mesh);
}
export function createM56Extras(parent:THREE.Group,dark:THREE.Material):M56Extras{
 const rivets=new THREE.Group();rivets.name='m56-earlier-liner-rivets';parent.add(rivets);
 // Early M56 used three exposed liner fasteners: one per side and one rear.
 // Sample the unified bell instead of hand-maintaining fastener positions.
 // Side rivets sit forward of each ear, rear rivet on the swept nape.
 for(const [frontSide,ear] of [[2,3],[7,6]]){
  // Between the two side facets: front of ear, on the steel wall.
  const upperFront=m56SurfacePoint(2,frontSide),
   upperEar=m56SurfacePoint(2,ear),
   hemFront=m56SurfacePoint(3,frontSide),
   hemEar=m56SurfacePoint(3,ear);
  const midpoint=(axis:number)=>mix(
   mix(upperFront[axis],upperEar[axis],.55),
   mix(hemFront[axis],hemEar[axis],.55),.28);
  const x=midpoint(0);
  part(rivets,dark,x+Math.sign(x)*.17,midpoint(1),midpoint(2),
   .42,.42,.40,'m56-rivet-side');
 }
 // Rear liner fastener, derived from the actual nape and not a prior Y.
 const upperRear=m56SurfacePoint(2,4),hemRear=m56SurfacePoint(3,4);
 part(rivets,dark,0,mix(upperRear[1],hemRear[1],.32),
  mix(upperRear[2],hemRear[2],.32)+.17,
  .42,.42,.40,'m56-rivet-rear');
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
  part(net,cloth,side*5.83,6.93,.15,.34,1.42,10.0,'m56-net-upper-side');
  part(net,cloth,side*6.17,5.40,.35,.34,1.20,12.3,'m56-net-mid-side');
 }
 // Eight coarse, premerged runs follow the ACTUAL rising brow, ear
 // transition, and lowered nape. A single horizontal bar floated on
 // the old lower apron and obscured the shell's defining silhouette.
 for(let i=0;i<M56_PERIMETER.length;i++)
  netLine(net,cloth,m56SurfacePoint(3,i),
   m56SurfacePoint(3,(i+1)%M56_PERIMETER.length));
 consolidateVisualGroup(rivets);consolidateVisualGroup(net);
 rivets.visible=false;net.visible=false;return {rivets,net};
}
export function updateM56Extras(v:M56Extras,options:M56Options|undefined){
 v.rivets.visible=options?.m56Details==='early-rivets';
 v.net.visible=options?.m56Net==='coarse';
}
