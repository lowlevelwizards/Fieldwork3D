/** Stage 1B: Blockbench-style cuboid headwear.
 *
 * All models are authored with +Y up, -Z toward the face, +X to the
 * operator's right. They attach to the canonical head node, preserving
 * the old +X animation frame beneath it.
 *
 * A helmet's silhouette comes from the proportions and coverage of
 * intentionally positioned BOXES ONLY. No rings, extrusions, cylinders,
 * curved brims or smoothed normals. Variants are authored independently
 * so 'high cut' is not an ACH that has merely been rescaled.
 */
import * as THREE from 'three';
export type HeadSilhouetteId='patrol-cap'|'ach'|'high-cut';
export type HeadSilhouetteMetrics={
 id:HeadSilhouetteId;frontExtent:number;rearExtent:number;top:number;
 earEdge:number;foreheadEdge:number;billLength:number;
};
export const HEAD_SILHOUETTE_METRICS:Readonly<Record<HeadSilhouetteId,HeadSilhouetteMetrics>>={
 'patrol-cap':{id:'patrol-cap',frontExtent:-7.82,rearExtent:4.80,
  top:8.89,earEdge:6.52,foreheadEdge:6.52,billLength:3.35},
 'ach':{id:'ach',frontExtent:-5.66,rearExtent:5.76,
  top:10.20,earEdge:3.08,foreheadEdge:6.19,billLength:0},
 'high-cut':{id:'high-cut',frontExtent:-5.58,rearExtent:5.45,
  top:9.94,earEdge:6.58,foreheadEdge:6.29,billLength:0}
};
type Cuboid={
 name:string;x:number;y:number;z:number;
 width:number;height:number;depth:number;
};
/** Explicit BoxGeometry construction: every surface is orthogonal. */
function addCuboid(parent:THREE.Group,material:THREE.Material,p:Cuboid){
 const box=new THREE.Mesh(new THREE.BoxGeometry(
  p.width,p.height,p.depth),material);
 box.name=p.name;
 box.position.set(p.x,p.y,p.z);
 box.castShadow=true;box.receiveShadow=true;
 box.userData.primitive='cuboid';
 parent.add(box);
}
/** Low, fairly flat cloth shape. A separated projecting bill is joined
 * by overlap behind the front band; there is NO round/warped visor.
 * The bands sit slightly outside the 8x8 skull to avoid coplanar faces.
 */
/** A few broad intersecting cuboids read as ONE cloth cap. Crown and
 * wrap overlap by ~.35 units, and bill seats within brow (not below it).
 * No separate little corner tabs or coplanar band and crown faces.
 */
function patrolCap(g:THREE.Group,m:THREE.Material){
 addCuboid(g,m,{name:'soft-flat-crown',x:0,y:8.00,z:.05,
  width:8.70,height:1.78,depth:8.82});
 addCuboid(g,m,{name:'forehead-band',x:0,y:7.00,z:-4.45,
  width:8.60,height:.96,depth:.70});
 for(const side of [-1,1])
  addCuboid(g,m,{name:side<0?'left-soft-side':'right-soft-side',
   x:side*4.10,y:7.00,z:0,width:.63,height:.96,depth:8.80});
 addCuboid(g,m,{name:'rear-band',x:0,y:7.00,z:4.45,
  width:8.60,height:.96,depth:.70});
 addCuboid(g,m,{name:'flat-short-bill',x:0,y:6.44,z:-6.14,
  width:7.20,height:.40,depth:3.35});
}
/** Traditional full-coverage shape. Lower ear panels continue right up
 * into the brow AND back into the nape, rather than hanging with gaps.
 * Sides sit just OUTSIDE the head while remaining almost flush with crown.
 */
function achHelmet(g:THREE.Group,m:THREE.Material){
 addCuboid(g,m,{name:'ach-primary-shell',x:0,y:8.18,z:0,
  width:10.20,height:3.00,depth:10.18});
 addCuboid(g,m,{name:'ach-stepped-upper-crown',x:0,y:9.65,z:.15,
  width:8.45,height:1.10,depth:8.55});
 addCuboid(g,m,{name:'ach-brow',x:0,y:6.79,z:-5.10,
  width:9.64,height:1.20,depth:1.12});
 for(const side of [-1,1])
  addCuboid(g,m,{name:side<0?'ach-deep-left-ear':'ach-deep-right-ear',
   x:side*4.62,y:5.23,z:.10,
   width:1.02,height:4.30,depth:10.00});
 addCuboid(g,m,{name:'ach-nape',x:0,y:5.55,z:5.22,
  width:9.66,height:3.55,depth:1.08});
}
/** Clean uninterrupted high side band. Its front meets the brow and its
 * back meets the short nape, avoiding the previous 'hanging hook' look.
 * Open ear region below y6.58 remains visibly distinct from the ACH.
 */
function highCutHelmet(g:THREE.Group,m:THREE.Material){
 addCuboid(g,m,{name:'highcut-compact-shell',x:0,y:8.17,z:0,
  width:9.75,height:2.75,depth:9.75});
 addCuboid(g,m,{name:'highcut-stepped-top',x:0,y:9.47,z:.15,
  width:8.30,height:.94,depth:8.45});
 addCuboid(g,m,{name:'highcut-brow',x:0,y:6.84,z:-5.02,
  width:9.20,height:1.10,depth:1.12});
 for(const side of [-1,1])
  addCuboid(g,m,{name:side<0?'highcut-left-temple':'highcut-right-temple',
   x:side*4.53,y:7.24,z:-.12,
   width:.88,height:1.32,depth:9.50});
 addCuboid(g,m,{name:'highcut-short-nape',x:0,y:6.50,z:4.95,
  width:9.20,height:1.65,depth:1.00});
}
export function createHeadwearSilhouette(
 id:HeadSilhouetteId,material:THREE.Material
):THREE.Group{
 const group=new THREE.Group();
 group.name='cuboid-'+id+'-minus-Z-forward';
 if(id==='patrol-cap')patrolCap(group,material);
 else if(id==='ach')achHelmet(group,material);
 else highCutHelmet(group,material);
 group.userData.stage='1B';
 group.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 group.userData.silhouette=id;
 group.userData.primitive='cuboids-only';
 return group;
}
