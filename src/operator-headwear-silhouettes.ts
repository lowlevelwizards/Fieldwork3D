/** Stage 1N: bold secondary shape hierarchy with the approved family silhouettes protected.
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
import {headwearFaceTone,headwearFaceRegion} from './operator-headwear-materials.ts';
export type HeadSilhouetteId='patrol-cap'|'boonie'|'beanie'|'beret'|'pasgt'|'soviet-steel'|'m1-steel'|'ddr-m56'|'ach'|'high-cut';
export type HeadSilhouetteMetrics={
 id:HeadSilhouetteId;frontExtent:number;rearExtent:number;top:number;
 earEdge:number;foreheadEdge:number;billLength:number;
};
export const HEAD_SILHOUETTE_METRICS:Readonly<Record<HeadSilhouetteId,HeadSilhouetteMetrics>>={
 'beret':{id:'beret',frontExtent:-5.10,rearExtent:5.10,top:8.56,earEdge:4.80,foreheadEdge:4.80,billLength:0},
 'patrol-cap':{id:'patrol-cap',frontExtent:-7.365,rearExtent:4.83,
  top:8.28,earEdge:4.64,foreheadEdge:4.64,billLength:2.85},
 'boonie':{id:'boonie',frontExtent:-6.725,rearExtent:6.725,
  top:8.255,earEdge:4.54,foreheadEdge:4.54,billLength:0},
 'beanie':{id:'beanie',frontExtent:-5.00,rearExtent:5.00,
  top:8.65,earEdge:3.745,foreheadEdge:3.745,billLength:0},
 'm1-steel':{id:'m1-steel',frontExtent:-6.37,rearExtent:6.37,
  top:8.75,earEdge:4.40,foreheadEdge:4.40,billLength:0},
 'ddr-m56':{id:'ddr-m56',frontExtent:-6.80,rearExtent:8.10,
  top:8.775,earEdge:4.43,foreheadEdge:4.65,billLength:0},
 'pasgt':{id:'pasgt',frontExtent:-6.34,rearExtent:5.68,
  top:8.78,earEdge:1.71,foreheadEdge:4.055,billLength:0},
 'soviet-steel':{id:'soviet-steel',frontExtent:-5.53,rearExtent:5.53,
  top:8.605,earEdge:3.70,foreheadEdge:4.05,billLength:0},
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

/** R5C BERET: knitted/wool fabric broad asymmetry. Fitted hollow band wraps
 * the unchanged 8x8 skull; one displaced crown and a strong drooped right lip
 * give the profile. Right/left drape is a mirrored whole-model variant.
 * No brim, floating disc, curved surface, or tiny ornamental staircases.
 */
const BERET_CUBOIDS:readonly HeadwearCuboid[]=[
 {name:'beret-crown',x:.6,y:7.76,z:0,width:10.25,height:1.55,depth:10.2},
 {name:'beret-oversized-shoulder',x:1.6,y:8.06,z:.15,
  width:10.60,height:1.00,depth:10.0},
 {name:'beret-right-drape',x:5.4,y:7.15,z:.10,
  width:2.45,height:1.65,depth:8.65},
 {name:'beret-dropped-lip',x:5.65,y:6.35,z:.50,
  width:1.80,height:1.08,depth:7.85},
 {name:'beret-front-band',x:0,y:5.55,z:-4.37,
  width:9.25,height:1.50,depth:1.02},
 {name:'beret-rear-band',x:0,y:5.55,z:4.37,
  width:9.25,height:1.50,depth:1.02},
 ...([-1,1] as const).map(sign=>({
  name:sign===-1?'beret-left-band':'beret-right-band',
  x:sign*4.16,y:5.55,z:0,width:.95,height:1.50,depth:9.50
 })),
 {name:'beret-badge-stiffener',x:-2.0,y:5.74,z:-4.96,
  width:2.1,height:1.62,depth:.55}
];

/** Stage 1N PATROL: taller band, still THREE reads. A flat fitted crown, ONE lower
 * band, ONE bill. Each hollow four-wall structure deliberately shares its
 * exterior planes; no 0.05-unit trim or stacked interstitial ledges.
 */
const PATROL_CAP_CUBOIDS:readonly HeadwearCuboid[]=[
 {name:'patrol-integrated-crown',x:0,y:7.59,z:0,
  width:8.86,height:1.38,depth:8.96},
 {name:'patrol-front-crown',x:0,y:6.25,z:-4.01,
  width:8.86,height:1.90,depth:.94},
 {name:'patrol-rear-crown',x:0,y:6.25,z:4.01,
  width:8.86,height:1.90,depth:.94},
 ...([-1,1] as const).map(sign=>({
  name:sign===-1?'patrol-left-crown':'patrol-right-crown',
  x:sign*3.96,y:6.25,z:0,width:.94,height:1.90,depth:8.96
 })),
 {name:'patrol-front-band',x:0,y:5.50,z:-4.33,
  width:9.60,height:1.72,depth:1.00},
 {name:'patrol-rear-band',x:0,y:5.50,z:4.33,
  width:9.60,height:1.72,depth:1.00},
 ...([-1,1] as const).map(sign=>({
  name:sign===-1?'patrol-left-band':'patrol-right-band',
  x:sign*4.28,y:5.50,z:0,width:1.04,height:1.72,depth:9.66
 })),
 {name:'patrol-anchored-bill',x:0,y:5.06,z:-5.94,
  width:7.65,height:1.02,depth:2.85}
];

/** Stage 1N BOONIE: taller band, still THREE reads. One low flat fabric crown, one
 * broad fitted band and one continuous, level, unbroken ring brim.
 * The technical sectors vanish in the union: no roof-shaped ledges.
 */
const BOONIE_CUBOIDS:readonly HeadwearCuboid[]=[
 {name:'boonie-integrated-crown',x:0,y:7.58,z:0,
  width:8.70,height:1.35,depth:8.76},
 {name:'boonie-front-crown',x:0,y:6.19,z:-3.91,
  width:8.70,height:2.03,depth:.94},
 {name:'boonie-rear-crown',x:0,y:6.19,z:3.91,
  width:8.70,height:2.03,depth:.94},
 ...([-1,1] as const).map(sign=>({
  name:sign===-1?'boonie-left-crown':'boonie-right-crown',
  x:sign*3.88,y:6.19,z:0,width:.94,height:2.03,depth:8.76
 })),
 {name:'boonie-front-band',x:0,y:5.48,z:-4.20,
  width:9.30,height:1.88,depth:.96},
 {name:'boonie-rear-band',x:0,y:5.48,z:4.20,
  width:9.30,height:1.88,depth:.96},
 ...([-1,1] as const).map(sign=>({
  name:sign===-1?'boonie-left-band':'boonie-right-band',
  x:sign*4.17,y:5.48,z:0,width:.96,height:1.88,depth:9.36
 })),
 {name:'boonie-front-brim',x:0,y:4.97,z:-5.50,
  width:13.45,height:.90,depth:2.45},
 {name:'boonie-rear-brim',x:0,y:4.97,z:5.50,
  width:13.45,height:.90,depth:2.45},
 ...([-1,1] as const).map(sign=>({
  name:sign===-1?'boonie-left-brim':'boonie-right-brim',
  x:sign*5.50,y:4.97,z:0,width:2.45,height:.90,depth:13.45
 }))
];

/** Stage 1N BEANIE: a stronger folded cuff retains the TWO-read profile,
 * but restores the taller knitted crown and deeper folded cuff visible in
 * the real watch-cap reference. No additional crown shoulder is introduced.
 */
const BEANIE_CUBOIDS:readonly HeadwearCuboid[]=[
 {name:'beanie-fitted-crown',x:0,y:7.7875,z:0,
  width:9.20,height:1.725,depth:9.40},
 {name:'beanie-front-body',x:0,y:5.96,z:-4.23,
  width:9.20,height:3.20,depth:.94},
 {name:'beanie-rear-body',x:0,y:5.96,z:4.23,
  width:9.20,height:3.20,depth:.94},
 ...([-1,1] as const).map(sign=>({
  name:sign===-1?'beanie-left-body':'beanie-right-body',
  x:sign*4.13,y:5.96,z:0,width:.94,height:3.20,depth:9.40
 })),
 {name:'beanie-front-cuff',x:0,y:4.955,z:-4.54,
  width:9.80,height:2.42,depth:.92},
 {name:'beanie-rear-cuff',x:0,y:4.955,z:4.54,
  width:9.80,height:2.42,depth:.92},
 ...([-1,1] as const).map(sign=>({
  name:sign===-1?'beanie-left-cuff':'beanie-right-cuff',
  x:sign*4.44,y:4.955,z:0,width:.92,height:2.42,depth:10.00
 }))
];

/** Stage 1N PASGT: brow seam cleanup preserves the original U.S.
 * PASGT (not an ACH derivative). One uninterrupted shell rather than
 * two crown tiers; its defining FEATURES are the protruding eyebrow peak,
 * long backward ear lobes and a deep continuous rear skirt.
 * Reference: 2005 U.S. Army PASGT vs ACH fit guidance; side-profile
 * photos of original PASGT shells.
 */
const PASGT_CUBOIDS:readonly HeadwearCuboid[]=[
 {name:'pasgt-single-protective-crown',x:0,y:7.08,z:0,
  width:10.35,height:3.40,depth:10.05},
 {name:'pasgt-integrated-front-peak',x:0,y:4.98,z:-5.40,
  width:10.35,height:1.85,depth:1.88},
 {name:'pasgt-low-rear-skirt',x:0,y:3.845,z:4.88,
  width:10.35,height:4.33,depth:1.60},
 ...([-1,1] as const).flatMap(sign=>[
  {name:sign===-1?'pasgt-left-temple':'pasgt-right-temple',
   x:sign*4.63,y:5.15,z:-2.90,
   width:1.09,height:1.86,depth:4.25},
  {name:sign===-1?'pasgt-left-ear-lobe':'pasgt-right-ear-lobe',
   x:sign*4.63,y:3.86,z:1.55,
   width:1.09,height:4.30,depth:6.00}
 ])
];

/** Stage 1N SSh-40: a single continuous, bold, anatomically stepped rim on the original Soviet SSh-40 bowl, not
 * a German Stahlhelm, medieval kettle, or brimmed hat. A substantial
 * continuous upper dome and deep HOLLOW bowl. The small lower flare
 * extends <0.5 unit past the bowl, removing the former wide roof shelf.
 * All four sectors share exact outer X/Z corner extents and substantial
 * 1.48-unit thickness; front Y4.05, sides Y3.70 and rear Y3.40 are
 * PURPOSEFUL coverage steps, not the former fractional corner artifacts.
 * Reference: original SSh-40 side/front/rear shell photographs.
 */
/** R5D M1: distinct US double-shell profile. A high broad bowl and one
 * strong projecting rim, leaving the operator's lower face fully open.
 * This is never a scaled SSh-40 or a modern PASGT shell.
 */
const M1_CUBOIDS:readonly HeadwearCuboid[]=[
 {name:'m1-integrated-high-dome',x:0,y:7.86,z:0,
  width:9.80,height:1.77,depth:10.65},
 {name:'m1-front-bowl',x:0,y:6.17,z:-4.83,
  width:10.94,height:2.92,depth:1.30},
 {name:'m1-rear-bowl',x:0,y:6.17,z:4.83,
  width:10.94,height:2.92,depth:1.30},
 ...([-1,1] as const).map(sign=>({
  name:sign<0?'m1-left-bowl':'m1-right-bowl',
  x:sign*4.85,y:6.17,z:0,width:1.25,height:2.92,depth:10.96
 })),
 {name:'m1-front-rolled-rim',x:0,y:4.78,z:-5.44,
  width:11.80,height:.76,depth:1.85},
 {name:'m1-rear-rolled-rim',x:0,y:4.78,z:5.44,
  width:11.80,height:.76,depth:1.85},
 ...([-1,1] as const).map(sign=>({
  name:sign<0?'m1-left-rolled-rim':'m1-right-rolled-rim',
  x:sign*5.44,y:4.78,z:0,width:1.20,height:.76,depth:12.20
 }))
];
/** R5H1 East German M56: wider shallow swept lower perimeter than M1.
 * Authored ring has real overlap in every axis before cube-union.
 */
const DDR_M56_CUBOIDS:readonly HeadwearCuboid[]=[
 {name:'m56-high-crown',x:0,y:8.05,z:.25,
  width:9.55,height:1.45,depth:10.70},
 {name:'m56-upper-front',x:0,y:6.85,z:-4.85,
  width:10.20,height:2.40,depth:1.40},
 {name:'m56-upper-rear',x:0,y:6.85,z:5.15,
  width:10.20,height:2.40,depth:1.40},
 ...([-1,1] as const).map(sign=>({
  name:sign<0?'m56-upper-left':'m56-upper-right',
  x:sign*4.62,y:6.85,z:.15,width:1.35,height:2.40,depth:10.90
 })),
 {name:'m56-middle-front',x:0,y:5.60,z:-5.65,
  width:11.80,height:1.75,depth:1.40},
 {name:'m56-middle-rear',x:0,y:5.60,z:6.25,
  width:11.80,height:1.75,depth:1.90},
 ...([-1,1] as const).map(sign=>({
  name:sign<0?'m56-middle-left':'m56-middle-right',
  x:sign*5.42,y:5.60,z:.30,width:1.65,height:1.75,depth:13.0
 })),
 {name:'m56-front-flare',x:0,y:5.02,z:-6.20,
  width:13.0,height:.72,depth:1.15},
 {name:'m56-rear-flare',x:0,y:4.65,z:7.25,
  width:13.15,height:.85,depth:1.70},
 ...([-1,1] as const).map(sign=>({
  name:sign<0?'m56-left-flare':'m56-right-flare',
  x:sign*6.22,y:4.80,z:.65,width:1.30,height:.85,depth:14.90
 }))
];
const STEEL_CUBOIDS:readonly HeadwearCuboid[]=[
 {name:'ssh40-main-dome',x:0,y:7.73,z:0,
  width:9.15,height:1.75,depth:9.25},
 {name:'ssh40-bowl-front',x:0,y:5.97,z:-4.56,
  width:10.00,height:3.10,depth:1.04},
 {name:'ssh40-bowl-rear',x:0,y:5.64,z:4.56,
  width:10.00,height:3.78,depth:1.04},
 ...([-1,1] as const).map(sign=>({
  name:sign===-1?'ssh40-bowl-left':'ssh40-bowl-right',
  x:sign*4.51,y:5.71,z:0,width:.98,height:3.62,depth:10.16
 })),
 {name:'ssh40-integrated-front-edge',x:0,y:4.79,z:-5.00,
  width:10.80,height:1.48,depth:1.06},
 {name:'ssh40-integrated-rear-edge',x:0,y:4.14,z:5.00,
  width:10.80,height:1.48,depth:1.06},
 ...([-1,1] as const).map(sign=>({
  name:sign===-1?'ssh40-integrated-left-edge':'ssh40-integrated-right-edge',
  x:sign*4.875,y:4.44,z:0,width:1.05,height:1.48,depth:11.06
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
 'beret':BERET_CUBOIDS,
 'patrol-cap':PATROL_CAP_CUBOIDS,
 'boonie':BOONIE_CUBOIDS,
 'beanie':BEANIE_CUBOIDS,
 'pasgt':PASGT_CUBOIDS,
 'soviet-steel':STEEL_CUBOIDS,
 'm1-steel':M1_CUBOIDS,
 'ddr-m56':DDR_M56_CUBOIDS,
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
 const geometry=unionCuboids(volume,{faceTone:(part,axis,sign)=>
  headwearFaceTone(id,part.name,axis,sign),
  faceRegion:(part,axis,sign)=>headwearFaceRegion(id,part.name,axis,sign)});
 const mesh=new THREE.Mesh(geometry,m);
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
  'patrol-cap':'1N','boonie':'1N','beanie':'1N','beret':'R5C',
  'pasgt':'1N','soviet-steel':'1N','m1-steel':'R5D','ddr-m56':'R5H1',
  'ach':'1E','high-cut':'1E'
 } as const)[id];
 group.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 group.userData.silhouette=id;
 group.userData.primitive='cuboids-only';
 return group;
}
