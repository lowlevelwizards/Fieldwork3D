/** H9.4a: three-hole ACH/MICH NVG shroud.
 * A shallow, graphic Wilcox-style retaining plate with authentic three-point
 * mount silhouette, negative-space wing cutouts, actual raised NVG receiver
 * guides and oversized readable fasteners. No electronics or gameplay role.
 */
import * as THREE from 'three';
import type {AchMichCoverShell} from './operator-ach-mich-cover-drape.ts';
import {sampleHelmetCover} from './operator-helmet-surface.ts';
const contour=(points:readonly (readonly [number,number])[]):THREE.Shape=>{
 const s=new THREE.Shape();
 for(let i=0;i<points.length;i++){
  const [x,y]=points[i];if(i===0)s.moveTo(x,y);else s.lineTo(x,y);
 }
 s.closePath();return s;
};
const relief=(shape:THREE.Shape,points:readonly (readonly [number,number])[])=>{
 const h=new THREE.Path();
 points.forEach(([x,y],i)=>i?h.lineTo(x,y):h.moveTo(x,y));
 h.closePath();shape.holes.push(h);
};
const face=(g:THREE.Group,name:string,shape:THREE.Shape,
 material:THREE.Material,depth=.15,z=0)=>{
 const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{
  depth,steps:1,bevelEnabled:false,curveSegments:1
 }),material);
 mesh.name=name;mesh.position.z=z;
 mesh.castShadow=false;mesh.receiveShadow=false;g.add(mesh);return mesh;
};
const screw=(g:THREE.Group,x:number,y:number,z:number,
 metal:THREE.Material,dark:THREE.Material)=>{
 const washer=new THREE.Mesh(new THREE.CylinderGeometry(.21,.21,.06,8),dark);
 washer.position.set(x,y,z);washer.rotation.x=Math.PI/2;
 washer.name='nvgs-washer';g.add(washer);
 const head=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.075,8),metal);
 head.position.set(x,y,z+.046);head.rotation.x=Math.PI/2;
 head.name='nvgs-mount-screw';g.add(head);
 for(const m of [washer,head]){m.castShadow=false;m.receiveShadow=false;}
};
/** Do not approximate the shroud with one front-facing rectangle. The
 * attaching frame comes from the actual draped shell/front facet, and
 * all three screw heads remain on the same molded mount.
 */
export function addAchMichThreeHoleShroud(
 shell:AchMichCoverShell,g:THREE.Group,
 metal:THREE.Material,dark:THREE.Material,light:THREE.Material
):void{
 const f=sampleHelmetCover(shell,'front',0,.26,.16);
 if(!f)throw Error('H9.4 missing front shroud face on '+shell);
 const anchor=new THREE.Group();
 anchor.name='h9-three-hole-shroud-surface-anchor';
 anchor.position.copy(f.position);
 anchor.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(
  f.right,f.up,f.normal));
 anchor.userData.h9SurfaceNormal=f.normal.toArray();
 anchor.userData.h9UsesCoverFrame=true;
 g.add(anchor);
 const outer:[number,number][]=[
  [-.62,1.16],[.62,1.16],[.82,.80],[.73,.34],
  [1.65,.18],[1.85,-.17],[1.70,-.57],[1.20,-.68],
  [.67,-.49],[.60,-1.06],[-.60,-1.06],[-.67,-.49],
  [-1.20,-.68],[-1.70,-.57],[-1.85,-.17],[-1.65,.18],
  [-.73,.34],[-.82,.80]
 ];
 const backing=contour(outer);
 face(anchor,'molded-shroud-rubber-interface',backing,dark,.055,-.06);
 const body=contour(outer);
 relief(body,[[-1.43,-.19],[-.95,-.13],[-.86,.16],[-1.35,.08]]);
 relief(body,[[1.43,-.19],[1.35,.08],[.86,.16],[.95,-.13]]);
 face(anchor,'three-hole-shroud-open-wings',body,metal,.14,.025);
 // Raised wedge and dark recessed NVG shoe: distinctly NOT a small box.
 const cradle=contour([
  [-.61,.73],[.61,.73],[.71,.42],[.69,-.65],
  [.50,-.90],[-.50,-.90],[-.69,-.65],[-.71,.42]
 ]);
 face(anchor,'raised-nvg-receiver-cradle',cradle,dark,.16,.185);
 const socket=contour([
  [-.42,.44],[.42,.44],[.42,-.42],[.28,-.67],
  [-.28,-.67],[-.42,-.42]
 ]);
 face(anchor,'nvg-receiver-locking-slot',socket,metal,.055,.36);
 const well=contour([
  [-.28,.28],[.28,.28],[.28,-.40],[-.28,-.40]
 ]);
 face(anchor,'recessed-nvg-locking-well',well,dark,.025,.420);
 for(const sign of [-1,1]){
  const guide=contour(sign===-1?[
   [-.69,.50],[-.49,.50],[-.49,-.62],[-.66,-.78]
  ]:[
   [.49,.50],[.69,.50],[.66,-.78],[.49,-.62]
  ]);
  face(anchor,'nvg-locking-track',guide,metal,.09,.385);
 }
 // Three real hole positions: top center and one each on the side wings.
 for(const [x,y] of [[0,.91],[-1.47,-.32],[1.47,-.32]])
  screw(anchor,x,y,.23,light,dark);
 anchor.userData.h9ShroudScrews=3;
 anchor.userData.h9ShroudProfile='three-hole-winged-nvg';
}
