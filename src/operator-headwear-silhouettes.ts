/** Stage 1K: anatomically fitted reference-led silhouette remakes.
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
 'patrol-cap':{id:'patrol-cap',frontExtent:-7.335,rearExtent:4.78,
  top:8.22,earEdge:4.695,foreheadEdge:4.695,billLength:3.15},
 'boonie':{id:'boonie',frontExtent:-6.695,rearExtent:6.695,
  top:8.18,earEdge:4.54,foreheadEdge:4.54,billLength:0},
 'beanie':{id:'beanie',frontExtent:-5.05,rearExtent:5.05,
  top:8.18,earEdge:3.77,foreheadEdge:3.77,billLength:0},
 'pasgt':{id:'pasgt',frontExtent:-6.08,rearExtent:5.755,
  top:8.85,earEdge:1.79,foreheadEdge:3.98,billLength:0},
 'soviet-steel':{id:'soviet-steel',frontExtent:-6.39,rearExtent:6.39,
  top:8.86,earEdge:3.605,foreheadEdge:4.01,billLength:0},
 'ach':{id:'ach',frontExtent:-5.62,rearExtent:5.60,
  top:8.84,earEdge:2.23,foreheadEdge:4.40,billLength:0},
 'high-cut':{id:'high-cut',frontExtent:-5.485,rearExtent:5.35,
  top:8.70,earEdge:5.95,foreheadEdge:4.50,billLength:0}
};
/** Stage 1K: hollow fitting bands instead of solid boxes perched on top.
 * Upper cap volumes sit above the skull; the side/front/rear panels wrap
 * around its existing 8x8 perimeter. In particular, these panels leave the
 * facial region and the space beneath the brim OPEN.
 * -Z is front; +Z is nape; X sides are symmetric unless stated otherwise.
 */

/** Patrol cap: single visually continuous low fabric crown + one bold bill.
 * The six authored volumes form just TWO apparent masses, not six tiers.
 */
const PATROL_CAP_CUBOIDS:readonly HeadwearCuboid[]=[
 {name:'patrol-integrated-crown',x:0,y:7.48,z:0,
  width:8.70,height:1.48,depth:8.78},
 {name:'patrol-front-fit',x:0,y:5.82,z:-4.32,
  width:8.75,height:2.25,depth:.92},
 {name:'patrol-rear-fit',x:0,y:5.84,z:4.32,
  width:8.75,height:2.22,depth:.92},
 ...([-1,1] as const).map(sign=>({
  name:sign===-1?'patrol-left-fit':'patrol-right-fit',
  x:sign*4.36,y:5.82,z:0,width:.94,height:2.25,depth:8.90
 })),
 {name:'patrol-anchored-bill',x:0,y:5.03,z:-5.76,
  width:7.65,height:.70,depth:3.15}
];

/** Boonie: one deep fitted fabric crown and one open-centred brim ring.
 * A solid 13x13 slab would cut through the face when placed correctly;
 * four broad connected brim sectors are one visible continuous gesture.
 */
const BOONIE_CUBOIDS:readonly HeadwearCuboid[]=[
 {name:'boonie-integrated-crown',x:0,y:7.43,z:0,
  width:8.78,height:1.50,depth:8.88},
 {name:'boonie-front-fit',x:0,y:5.79,z:-4.34,
  width:8.80,height:2.35,depth:.94},
 {name:'boonie-rear-fit',x:0,y:5.79,z:4.34,
  width:8.80,height:2.35,depth:.94},
 ...([-1,1] as const).map(sign=>({
  name:sign===-1?'boonie-left-fit':'boonie-right-fit',
  x:sign*4.37,y:5.79,z:0,width:.94,height:2.35,depth:8.94
 })),
 {name:'boonie-front-brim',x:0,y:4.91,z:-5.47,
  width:12.70,height:.74,depth:2.45},
 {name:'boonie-rear-brim',x:0,y:4.91,z:5.47,
  width:12.70,height:.74,depth:2.45},
 ...([-1,1] as const).map(sign=>({
  name:sign===-1?'boonie-left-brim':'boonie-right-brim',
  x:sign*5.43,y:4.91,z:0,width:2.52,height:.74,depth:12.70
 }))
];

/** Beanie: close-fitting shell and ONE broad folded cuff, both hollow.
 * The cuff crosses the brow/upper-ear plane, rather than sitting at Y5.58.
 */
const BEANIE_CUBOIDS:readonly HeadwearCuboid[]=[
 {name:'beanie-fitted-crown',x:0,y:7.52,z:0,
  width:8.62,height:1.32,depth:8.72},
 {name:'beanie-front-body',x:0,y:5.63,z:-4.32,
  width:8.64,height:3.03,depth:.92},
 {name:'beanie-rear-body',x:0,y:5.63,z:4.32,
  width:8.64,height:3.03,depth:.92},
 ...([-1,1] as const).map(sign=>({
  name:sign===-1?'beanie-left-body':'beanie-right-body',
  x:sign*4.33,y:5.63,z:0,width:.92,height:3.03,depth:8.84
 })),
 {name:'beanie-front-cuff',x:0,y:4.46,z:-4.55,
  width:9.14,height:1.38,depth:1.00},
 {name:'beanie-rear-cuff',x:0,y:4.46,z:4.55,
  width:9.14,height:1.38,depth:1.00},
 ...([-1,1] as const).map(sign=>({
  name:sign===-1?'beanie-left-cuff':'beanie-right-cuff',
  x:sign*4.53,y:4.46,z:0,width:1.08,height:1.38,depth:9.28
 }))
];

/** PASGT: an independently authored older Kevlar shell, based on original
 * US PASGT ortho references. Low brow/peak, deep side lobes, low rear.
 * Unlike the ACH, its protective profile is deliberately skirted and
 * projects well forward of the forehead. All joins physically overlap.
 */
const PASGT_CUBOIDS:readonly HeadwearCuboid[]=[
 {name:'pasgt-upper-dome',x:0,y:7.95,z:0,
  width:9.20,height:1.80,depth:9.30},
 {name:'pasgt-broad-shoulder',x:0,y:7.02,z:0,
  width:10.45,height:2.15,depth:10.50},
 {name:'pasgt-integrated-front-peak',x:0,y:5.16,z:-5.34,
  width:10.45,height:2.36,depth:1.48},
 {name:'pasgt-low-rear-skirt',x:0,y:4.15,z:4.98,
  width:10.85,height:4.72,depth:1.55},
 ...([-1,1] as const).flatMap(sign=>[
  {name:sign===-1?'pasgt-left-temple':'pasgt-right-temple',
   x:sign*4.88,y:5.05,z:-3.35,
   width:1.36,height:2.55,depth:3.35},
  {name:sign===-1?'pasgt-left-ear-lobe':'pasgt-right-ear-lobe',
   x:sign*4.88,y:4.17,z:1.42,
   width:1.36,height:4.76,depth:6.75}
 ])
];

/** SSh-40: not stacked roofing slabs. A two-step blocky dome enters one
 * deep HOLLOW bell, whose lower four rim sectors form one integrated flare.
 * The characteristic shallow front projection, low ear sides, and rear
 * flare are independently sized from reference, not scaled from PASGT.
 */
const STEEL_CUBOIDS:readonly HeadwearCuboid[]=[
 {name:'ssh40-dome-crown',x:0,y:8.00,z:0,
  width:8.35,height:1.72,depth:8.55},
 {name:'ssh40-dome-shoulder',x:0,y:6.98,z:0,
  width:9.70,height:2.36,depth:9.82},
 {name:'ssh40-bell-front',x:0,y:5.08,z:-4.74,
  width:9.80,height:2.12,depth:.96},
 {name:'ssh40-bell-rear',x:0,y:4.86,z:4.74,
  width:9.80,height:2.54,depth:.96},
 ...([-1,1] as const).map(sign=>({
  name:sign===-1?'ssh40-bell-left':'ssh40-bell-right',
  x:sign*4.80,y:4.99,z:0,width:1.00,height:2.35,depth:9.62
 })),
 {name:'ssh40-flared-front',x:0,y:4.43,z:-5.43,
  width:12.35,height:.84,depth:1.92},
 {name:'ssh40-flared-rear',x:0,y:4.00,z:5.43,
  width:12.35,height:.90,depth:1.92},
 ...([-1,1] as const).map(sign=>({
  name:sign===-1?'ssh40-flared-left':'ssh40-flared-right',
  x:sign*5.25,y:4.12,z:0,width:2.10,height:1.03,depth:11.75
 }))
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
  'patrol-cap':'1K','boonie':'1K','beanie':'1K',
  'pasgt':'1K','soviet-steel':'1K',
  'ach':'1E','high-cut':'1E'
 } as const)[id];
 group.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 group.userData.silhouette=id;
 group.userData.primitive='cuboids-only';
 return group;
}
