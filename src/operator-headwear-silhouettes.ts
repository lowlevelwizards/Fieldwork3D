/** Stage 1E: intentional, bold cuboid headwear.
 *
 * All models are authored with +Y up, -Z toward the face, +X to the
 * operator's right. They attach to the canonical head node, preserving
 * the old +X animation frame beneath it.
 *
 * Each helmet consists of authored rectangular VOLUMES whose exterior
 * is joined to eliminate coplanar overlaps. Every resulting polygon is
 * axis-aligned, with no arcs, facets, extrusions or smoothed curved shells.
 * The ACH and high-cut have independent actual lower-edge profiles.
 */
import * as THREE from 'three';
import {unionCuboids,type HeadwearCuboid} from './operator-cuboid-union.ts';
import {CUBE_HEAD_ANATOMY} from './operator-head-anatomy.ts';
export type HeadSilhouetteId='patrol-cap'|'ach'|'high-cut';
export type HeadSilhouetteMetrics={
 id:HeadSilhouetteId;frontExtent:number;rearExtent:number;top:number;
 earEdge:number;foreheadEdge:number;billLength:number;
};
export const HEAD_SILHOUETTE_METRICS:Readonly<Record<HeadSilhouetteId,HeadSilhouetteMetrics>>={
 'patrol-cap':{id:'patrol-cap',frontExtent:-7.82,rearExtent:4.80,
  top:8.89,earEdge:6.52,foreheadEdge:6.52,billLength:3.35},
 'ach':{id:'ach',frontExtent:-5.62,rearExtent:5.60,
  top:8.84,earEdge:2.23,foreheadEdge:4.40,billLength:0},
 'high-cut':{id:'high-cut',frontExtent:-5.485,rearExtent:5.35,
  top:8.70,earEdge:5.95,foreheadEdge:4.50,billLength:0}
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
/** Stage 1E — confident, subtractive helmet silhouettes.
 * Every external step denotes a coverage decision, not a decorative rim:
 * ACH has one deep ear/nape wrap; high-cut has one open ear interval.
 * Long contiguous shapes deliberately replace narrow adjacent risers.
 * The skull, its visual anatomical landmarks and the attachment frame
 * remain unchanged. All intersections are joined by the union mesher.
 */
const ACH_CUBOIDS:readonly HeadwearCuboid[]=[
 // Uninterrupted crown: the former 0.34-high top plate added a hairline
 // contour with no distinct protective purpose.
 {name:'ach-continuous-crown',x:0,y:7.32,z:0,
  width:10.15,height:3.04,depth:10.25},
 // One broad brow line; a side return meets it at the same lower edge.
 {name:'ach-protective-brow',x:0,y:5.25,z:-4.98,
  width:10.15,height:1.70,depth:1.28},
 // Deep nape and ear coverage share ONE lower line (Y2.23). We deliberately
 // sacrifice the old Y2.70->Y2.45->Y2.23 micro-staircase.
 {name:'ach-continuous-nape',x:0,y:4.28,z:4.97,
  width:10.15,height:4.10,depth:1.26},
 ...([-1,1] as const).flatMap(sign=>[
  {name:sign===-1?'ach-left-temple':'ach-right-temple',
   x:sign*4.55,y:5.25,z:-3.12,
   width:1.05,height:1.70,depth:2.44},
  {name:sign===-1?'ach-left-ear-wrap':'ach-right-ear-wrap',
   x:sign*4.55,y:4.28,z:1.85,
   width:1.05,height:4.10,depth:7.50}
 ])
];
/** High-cut uses the same single-mass crown logic, but the ear region
 * is genuine NEGATIVE space: low brow -> clean high cut -> low rear.
 * No thin cap strip or ornamental temple prong at the cutout.
 */
const HIGH_CUT_CUBOIDS:readonly HeadwearCuboid[]=[
 {name:'highcut-continuous-crown',x:0,y:7.325,z:0,
  width:9.75,height:2.75,depth:9.85},
 {name:'highcut-protective-brow',x:0,y:5.40,z:-4.855,
  width:9.75,height:1.80,depth:1.26},
 // A single substantial rear mass forms the rear side return AND nape.
 {name:'highcut-continuous-nape',x:0,y:4.70,z:4.175,
  width:9.75,height:3.20,depth:2.35},
 ...([-1,1] as const).map(sign=>({
  name:sign===-1?'highcut-left-temple':'highcut-right-temple',
  x:sign*4.395,y:5.40,z:-3.2625,
  width:.96,height:1.80,depth:1.925
 }))
];
/** Symbolic anatomical coverage contract, based on current unchanged head.
 * Y values are local to the existing head bone. Tests also measure the
 * actual union profile, not just declared intent.
 */
export const HEADWEAR_FIT_TARGETS=Object.freeze({
 ach:{
  brow:CUBE_HEAD_ANATOMY.brow+.10,
  ear:CUBE_HEAD_ANATOMY.earCenter-.37,
  nape:CUBE_HEAD_ANATOMY.nape+.03
 },
 'high-cut':{
  brow:CUBE_HEAD_ANATOMY.brow+.20,
  ear:CUBE_HEAD_ANATOMY.earTop+1.95,
  nape:CUBE_HEAD_ANATOMY.nape+.90
 }
});
/** Authored source of silhouette proportions; never derive helmet type
 * by scaling another helmet or by swapping detail strips.
 */
export function headwearCuboidVolumes(
 id:'ach'|'high-cut'
):readonly HeadwearCuboid[]{
 return id==='ach'?ACH_CUBOIDS:HIGH_CUT_CUBOIDS;
}
function helmetFromVolumes(g:THREE.Group,m:THREE.Material,
 id:'ach'|'high-cut'){
 const volume=headwearCuboidVolumes(id);
 const mesh=new THREE.Mesh(unionCuboids(volume),m);
 mesh.name=id+'-continuous-cuboid-exterior';
 mesh.castShadow=true;
 // A single exterior can cast onto the head, but shouldn't create
 // shadow-map striping from itself during neutral close-up inspection.
 mesh.receiveShadow=false;
 g.add(mesh);
 g.userData.sourceCuboids=volume.map(v=>({...v}));
}
export function createHeadwearSilhouette(
 id:HeadSilhouetteId,material:THREE.Material
):THREE.Group{
 const group=new THREE.Group();
 group.name='cuboid-'+id+'-minus-Z-forward';
 if(id==='patrol-cap')patrolCap(group,material);
 else if(id==='ach')helmetFromVolumes(group,material,'ach');
 else helmetFromVolumes(group,material,'high-cut');
 group.userData.stage='1E';
 group.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 group.userData.silhouette=id;
 group.userData.primitive='cuboids-only';
 return group;
}
