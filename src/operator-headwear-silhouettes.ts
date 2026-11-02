/** Stages 1E–1J: confident, anatomically grounded cuboid headwear.
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
export type HeadSilhouetteId='patrol-cap'|'boonie'|'beanie'|'pasgt'|'soviet-steel'|'ach'|'high-cut';
export type HeadSilhouetteMetrics={
 id:HeadSilhouetteId;frontExtent:number;rearExtent:number;top:number;
 earEdge:number;foreheadEdge:number;billLength:number;
};
export const HEAD_SILHOUETTE_METRICS:Readonly<Record<HeadSilhouetteId,HeadSilhouetteMetrics>>={
 'patrol-cap':{id:'patrol-cap',frontExtent:-7.79,rearExtent:4.525,
  top:8.89,earEdge:6.37,foreheadEdge:6.37,billLength:3.70},
 'boonie':{id:'boonie',frontExtent:-6.95,rearExtent:6.60,
  top:8.85,earEdge:5.975,foreheadEdge:5.69,billLength:0},
 'beanie':{id:'beanie',frontExtent:-4.75,rearExtent:4.75,
  top:8.75,earEdge:5.58,foreheadEdge:5.58,billLength:0},
 'pasgt':{id:'pasgt',frontExtent:-5.80,rearExtent:5.83,
  top:9.25,earEdge:2.46,foreheadEdge:4.42,billLength:0},
 'soviet-steel':{id:'soviet-steel',frontExtent:-6.275,rearExtent:6.275,
  top:9.195,earEdge:4.635,foreheadEdge:4.635,billLength:0},
 'ach':{id:'ach',frontExtent:-5.62,rearExtent:5.60,
  top:8.84,earEdge:2.23,foreheadEdge:4.40,billLength:0},
 'high-cut':{id:'high-cut',frontExtent:-5.485,rearExtent:5.35,
  top:8.70,earEdge:5.95,foreheadEdge:4.50,billLength:0}
};
/** Stage 1F: one flat crown, one substantial wrap and a short, solid bill.
 * The band is not decorative trim. Its lower edge is the cap's fit line.
 */
const PATROL_CAP_CUBOIDS:readonly HeadwearCuboid[]=[
 {name:'patrol-solid-crown',x:0,y:7.98,z:0,width:8.65,height:1.82,depth:8.65},
 {name:'patrol-structural-wrap',x:0,y:6.93,z:0,width:9.10,height:1.12,depth:9.05},
 {name:'patrol-bill',x:0,y:6.49,z:-5.94,width:7.20,height:.72,depth:3.70}
];

/** Stage 1G: wide, confident fabric brim. One broad front drop suggests
 * weight and soft fabric without a staircase of little corner tabs.
 */
const BOONIE_CUBOIDS:readonly HeadwearCuboid[]=[
 {name:'boonie-low-crown',x:0,y:7.90,z:0,width:8.90,height:1.90,depth:8.95},
 {name:'boonie-structural-wrap',x:0,y:6.95,z:0,width:9.25,height:1.15,depth:9.30},
 {name:'boonie-wide-brim',x:0,y:6.40,z:0,width:13.25,height:.85,depth:13.20},
 {name:'boonie-front-fabric-drop',x:0,y:6.20,z:-5.95,
  width:11.60,height:1.02,depth:2.00}
];

/** Stage 1H: no decorative ribbing or pixel-scale approximated curvature.
 * The low broad cuff is the only secondary mass.
 */
const BEANIE_CUBOIDS:readonly HeadwearCuboid[]=[
 {name:'beanie-fitted-crown',x:0,y:7.75,z:0,width:8.65,height:2.00,depth:8.75},
 {name:'beanie-folded-cuff',x:0,y:6.28,z:0,width:9.40,height:1.40,depth:9.50}
];

/** Stage 1I: larger and deeper than the ACH, never a scaled ACH clone.
 * Brow, temple, ear and nape heights each correspond to protective coverage.
 */
const PASGT_CUBOIDS:readonly HeadwearCuboid[]=[
 {name:'pasgt-full-crown',x:0,y:7.48,z:0,width:10.65,height:3.54,depth:10.75},
 {name:'pasgt-deep-brow',x:0,y:5.42,z:-5.10,width:10.65,height:2.00,depth:1.40},
 {name:'pasgt-low-nape',x:0,y:4.54,z:5.07,width:10.65,height:4.16,depth:1.52},
 ...([-1,1] as const).flatMap(sign=>[
  {name:sign===-1?'pasgt-left-temple':'pasgt-right-temple',
   x:sign*4.85,y:5.28,z:-3.25,width:1.30,height:2.70,depth:3.30},
  {name:sign===-1?'pasgt-left-ear':'pasgt-right-ear',
   x:sign*4.85,y:4.54,z:1.55,width:1.30,height:4.16,depth:7.00}
 ])
];

/** Stage 1J: deliberately broad, historical steel-pot mass. The upper
 * crown step represents the dome; the one thick projecting rim represents
 * the steel shell's brim, not an added ornament.
 */
const STEEL_CUBOIDS:readonly HeadwearCuboid[]=[
 {name:'steel-pot-body',x:0,y:6.95,z:0,width:10.80,height:2.95,depth:10.90},
 {name:'steel-pot-upper-crown',x:0,y:8.22,z:0,
  width:9.10,height:1.95,depth:9.20},
 {name:'steel-pot-strong-rim',x:0,y:5.26,z:0,
  width:12.35,height:1.25,depth:12.55}
];

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
 // One broad brow line; side volumes share its lower edge and overlap
 // by a visible margin, rather than merely touching at float-precision seams.
 {name:'ach-protective-brow',x:0,y:5.25,z:-4.98,
  width:10.15,height:1.70,depth:1.28},
 // Deep nape and ear coverage share ONE lower line (Y2.23). We deliberately
 // sacrifice the old Y2.70->Y2.45->Y2.23 micro-staircase.
 {name:'ach-continuous-nape',x:0,y:4.28,z:4.97,
  width:10.15,height:4.10,depth:1.26},
 ...([-1,1] as const).flatMap(sign=>[
  {name:sign===-1?'ach-left-temple':'ach-right-temple',
   x:sign*4.55,y:5.25,z:-3.25,
   width:1.05,height:1.70,depth:2.60},
  {name:sign===-1?'ach-left-ear-wrap':'ach-right-ear-wrap',
   x:sign*4.55,y:4.28,z:1.70,
   width:1.05,height:4.10,depth:7.80}
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
  x:sign*4.395,y:5.40,z:-3.35,
  width:.96,height:1.80,depth:2.25
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
const HEADGEAR_VOLUMES:Readonly<Record<HeadSilhouetteId,readonly HeadwearCuboid[]>>={
 'patrol-cap':PATROL_CAP_CUBOIDS,
 'boonie':BOONIE_CUBOIDS,
 'beanie':BEANIE_CUBOIDS,
 'pasgt':PASGT_CUBOIDS,
 'soviet-steel':STEEL_CUBOIDS,
 'ach':ACH_CUBOIDS,
 'high-cut':HIGH_CUT_CUBOIDS
};
/** All seven authored shapes use one exterior union mesh and the same -Z
 * head-local attachment, in battle as well as Operator Lab.
 */
export function headwearCuboidVolumes(id:HeadSilhouetteId):readonly HeadwearCuboid[]{
 return HEADGEAR_VOLUMES[id];
}
function headwearFromVolumes(g:THREE.Group,m:THREE.Material,id:HeadSilhouetteId){
 const volume=headwearCuboidVolumes(id);
 const mesh=new THREE.Mesh(unionCuboids(volume),m);
 mesh.name=id+'-continuous-cuboid-exterior';
 mesh.castShadow=true;
 // Keep its self-shadow noise out of the clean close-up silhouette review.
 mesh.receiveShadow=false;
 g.add(mesh);
 g.userData.sourceCuboids=volume.map(v=>({...v}));
}
export function createHeadwearSilhouette(
 id:HeadSilhouetteId,material:THREE.Material
):THREE.Group{
 const group=new THREE.Group();
 group.name='cuboid-'+id+'-minus-Z-forward';
 headwearFromVolumes(group,material,id);
 group.userData.stage=({
  'patrol-cap':'1F','boonie':'1G','beanie':'1H',
  'pasgt':'1I','soviet-steel':'1J',
  'ach':'1E','high-cut':'1E'
 } as const)[id];
 group.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 group.userData.silhouette=id;
 group.userData.primitive='cuboids-only';
 return group;
}
