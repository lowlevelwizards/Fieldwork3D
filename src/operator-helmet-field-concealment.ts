/** H9.2: ACH/MICH sewn vegetation buttonholes, hanging scrim and
 * PASGT-authored foliage. Static local-surface mounts only: no animated
 * vegetation, no per-frame rays, no helmet family-wide XYZ guesses.
 */
import * as THREE from 'three';
import type {AchMichCoverShell} from './operator-ach-mich-cover-drape.ts';
import {sampleHelmetCover,type CoverRegion,type HelmetSurfaceFrame}
 from './operator-helmet-surface.ts';
import {PASGT_LEAF_CLUSTERS,createPasgtScrimRibbonGeometry}
 from './operator-pasgt-field-dress.ts';
type Slot={region:Exclude<CoverRegion,'crown'>;u:number;v:number};
const SLOTS:readonly Slot[]=[
 {region:'front',u:-.56,v:-.07},
 {region:'front',u:.53,v:.11},
 {region:'back',u:-.57,v:.10},
 {region:'back',u:.60,v:-.12},
 {region:'right',u:-.75,v:.02},
 {region:'right',u:-.27,v:.27},
 {region:'right',u:.35,v:-.13},
 {region:'right',u:.77,v:.13},
 {region:'left',u:-.72,v:-.08},
 {region:'left',u:-.21,v:.23},
 {region:'left',u:.39,v:-.14},
 {region:'left',u:.76,v:.08}
];
// Occupancy order intentionally alternates side, brow and nape. Heavy
// foliage is NOT a mirrored hedge or a repeated planted-tree silhouette.
const LEAF_SLOTS=[4,9,2,0,7,10,5,1,8,11] as const;
const SCRIM_SLOTS=[1,10,4,3,8,6,0,11] as const;
const LEAN=[-.18,.11,-.24,.17,.08,-.13,.21,-.12,.16,-.08] as const;
const SCALE=[.89,1.04,.81,1.06,.88,.98,1.10,.84,1.02,.93] as const;
const slitMaterial=new THREE.MeshBasicMaterial({
 color:0x394638,side:THREE.DoubleSide,depthWrite:true
});
const stitchMaterial=new THREE.MeshBasicMaterial({
 color:0x859274,side:THREE.DoubleSide,depthWrite:true
});
const slitCut=new THREE.PlaneGeometry(1.36,.115);
const slitStitch=new THREE.PlaneGeometry(1.54,.040);
const endStitch=new THREE.PlaneGeometry(.07,.25);
const basis=(right:THREE.Vector3,up:THREE.Vector3,normal:THREE.Vector3)=>
 new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4()
  .makeBasis(right,up,normal));
const mark=(g:THREE.Group,f:HelmetSurfaceFrame,
 geometry:THREE.BufferGeometry,material:THREE.Material,
 name:string,x=0,y=0,z=0)=>{
 const piece=new THREE.Mesh(geometry,material);piece.name=name;
 piece.position.copy(f.position).addScaledVector(f.right,x)
  .addScaledVector(f.up,y).addScaledVector(f.normal,z);
 piece.quaternion.copy(basis(f.right,f.up,f.normal));
 piece.castShadow=false;piece.receiveShadow=false;g.add(piece);
 return piece;
};
/** Curated fixed positions. Independent leaf meshes stay toggleable;
 * other static items can merge by material and original shadow flags. */
export function addAchMichConcealment(
 shell:AchMichCoverShell,
 loops:THREE.Group,scrim:THREE.Group,leaves:THREE.Group,
 olive:THREE.MeshStandardMaterial,tan:THREE.MeshStandardMaterial
):void{
 const frames=SLOTS.map((slot,i)=>{
  const f=sampleHelmetCover(shell,slot.region,slot.u,slot.v,.105);
  if(!f)throw Error('H9.2 no cover at buttonhole '+shell+' #'+i);
  mark(loops,f,slitCut,slitMaterial,'horizontal-fabric-buttonhole',0,0,.018);
  for(const y of [-.11,.11])
   mark(loops,f,slitStitch,stitchMaterial,'buttonhole-reinforcement',
    0,y,.023);
  for(const x of [-.75,.75])
   mark(loops,f,endStitch,stitchMaterial,'buttonhole-end-stitch',
    x,0,.027);
  return f;
 });
 for(let i=0;i<SCRIM_SLOTS.length;i++){
  const slot=SCRIM_SLOTS[i],f=frames[slot];
  // The free end extends along negative Y: orient positive Y inward and
  // upward so the fabric hangs OUTWARD and DOWN from its actual slit.
  const up=f.up.clone().multiplyScalar(.77)
   .addScaledVector(f.normal,-.64).normalize();
  const right=f.right.clone(),normal=right.clone().cross(up).normalize();
  const fabric=new THREE.Mesh(createPasgtScrimRibbonGeometry(i),
   i%3===0?tan:olive);
  fabric.name='pasgt-derived-folded-scrim';
  fabric.position.copy(f.position);
  fabric.quaternion.copy(basis(right,up,normal));
  fabric.rotateZ(LEAN[i]*.7);
  fabric.scale.setScalar(.58+(i%4)*.055);
  fabric.userData.h9ScrimDownOut=true;fabric.userData.h9SourceSlot=slot;
  fabric.castShadow=false;fabric.receiveShadow=false;scrim.add(fabric);
 }
 for(let i=0;i<LEAF_SLOTS.length;i++){
  const slot=LEAF_SLOTS[i],f=frames[slot];
  // PASGT geometry grows along local +Y; lean that axis DOWN/OUT,
  // with authored slot-based angles rather than vertical hedgerows.
  const aim=f.normal.clone().multiplyScalar(.80+(i%3)*.08)
   .addScaledVector(f.up,-(.65+(i%4)*.09)).normalize();
  const right=f.right.clone();
  let facing=right.clone().cross(aim).normalize();
  if(facing.dot(f.normal)<0){
   right.negate();facing=right.clone().cross(aim).normalize();
  }
  const bunch=new THREE.Mesh(PASGT_LEAF_CLUSTERS[i%3],i%3===0?tan:olive);
  bunch.name='pasgt-derived-foliage';
  bunch.position.copy(f.position).addScaledVector(f.normal,.12);
  bunch.quaternion.copy(basis(right,aim,facing));
  bunch.rotateZ(LEAN[i]);bunch.rotateY(i%2?.10:-.12);
  bunch.scale.setScalar(SCALE[i]);
  bunch.castShadow=false;bunch.receiveShadow=false;
  bunch.userData.h9OutwardDown=[aim.x,aim.y,aim.z];
  bunch.userData.h9Anchor=slot;
  bunch.userData.keepSeparate=true;leaves.add(bunch);
 }
 loops.userData.h9SewnSlitCount=frames.length;
 scrim.userData.h9FoldedStrips=SCRIM_SLOTS.length;
 leaves.userData.h9FoliageAnchors=LEAF_SLOTS.length;
}
