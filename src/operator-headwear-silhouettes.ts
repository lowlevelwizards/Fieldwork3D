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
 'patrol-cap':{id:'patrol-cap',frontExtent:-8.12,rearExtent:4.62,
  top:8.90,earEdge:6.05,foreheadEdge:6.05,billLength:3.20},
 'ach':{id:'ach',frontExtent:-5.55,rearExtent:5.73,
  top:10.30,earEdge:2.95,foreheadEdge:6.15,billLength:0},
 'high-cut':{id:'high-cut',frontExtent:-5.50,rearExtent:5.25,
  top:9.93,earEdge:6.32,foreheadEdge:6.15,billLength:0}
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
function patrolCap(g:THREE.Group,m:THREE.Material){
 addCuboid(g,m,{name:'soft-flat-crown',x:0,y:8.05,z:.05,
  width:8.70,height:1.70,depth:8.82});
 addCuboid(g,m,{name:'forehead-band',x:0,y:6.82,z:-4.49,
  width:8.52,height:1.30,depth:.92});
 for(const side of [-1,1])
  addCuboid(g,m,{name:side<0?'left-soft-side':'right-soft-side',
   x:side*4.44,y:6.80,z:.04,width:.90,height:1.32,depth:8.40});
 addCuboid(g,m,{name:'rear-band',x:0,y:6.85,z:4.48,
  width:8.55,height:1.30,depth:.92});
 addCuboid(g,m,{name:'flat-short-bill',x:0,y:6.10,z:-6.49,
  width:7.12,height:.46,depth:3.26});
}
/** Full-coverage helmet: heavier brow, deep ears, substantial rear nape.
 * Outer surfaces are stepped; no hidden interior block below the skull.
 */
function achHelmet(g:THREE.Group,m:THREE.Material){
 addCuboid(g,m,{name:'ach-primary-shell',x:0,y:8.40,z:0,
  width:10.20,height:2.45,depth:10.18});
 addCuboid(g,m,{name:'ach-stepped-upper-crown',x:0,y:9.64,z:.15,
  width:8.45,height:1.32,depth:8.55});
 addCuboid(g,m,{name:'ach-brow',x:0,y:6.79,z:-5.07,
  width:9.58,height:1.20,depth:1.00});
 for(const side of [-1,1])
  addCuboid(g,m,{name:side<0?'ach-deep-left-ear':'ach-deep-right-ear',
   x:side*5.02,y:5.13,z:.22,
   width:.96,height:4.36,depth:7.40});
 addCuboid(g,m,{name:'ach-nape',x:0,y:5.56,z:5.23,
  width:9.65,height:3.50,depth:.98});
}
/** High-cut: similar upper shell family, but radically less side coverage.
 * The exposed side of the 8x8 head remains visible below y=6.3.
 */
function highCutHelmet(g:THREE.Group,m:THREE.Material){
 addCuboid(g,m,{name:'highcut-compact-shell',x:0,y:8.25,z:0,
  width:9.75,height:2.17,depth:9.75});
 addCuboid(g,m,{name:'highcut-stepped-top',x:0,y:9.36,z:.15,
  width:8.30,height:1.14,depth:8.45});
 addCuboid(g,m,{name:'highcut-brow',x:0,y:6.78,z:-5.02,
  width:9.20,height:1.26,depth:.96});
 for(const side of [-1,1])
  addCuboid(g,m,{name:side<0?'highcut-left-temple':'highcut-right-temple',
   x:side*4.80,y:6.90,z:-.40,
   width:.85,height:1.12,depth:4.10});
 addCuboid(g,m,{name:'highcut-short-nape',x:0,y:6.22,z:4.94,
  width:9.20,height:2.03,depth:.96});
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
