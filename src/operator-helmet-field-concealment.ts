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
function surfaceMount(frame:HelmetSurfaceFrame):THREE.Group{
 const g=new THREE.Group();g.position.copy(frame.position);
 g.quaternion.setFromRotationMatrix(new THREE.Matrix4()
  .makeBasis(frame.right,frame.up,frame.normal));
 return g;
}
const addPiece=(parent:THREE.Group,geometry:THREE.BufferGeometry,
 material:THREE.Material,name:string,y:number,z:number)=>{
 const m=new THREE.Mesh(geometry,material);
 m.name=name;m.position.set(0,y,z);m.castShadow=false;m.receiveShadow=false;
 parent.add(m);return m;
};
export function addAchMichConcealment(
 shell:AchMichCoverShell,
 loops:THREE.Group,scrim:THREE.Group,leaves:THREE.Group,
 olive:THREE.MeshStandardMaterial,tan:THREE.MeshStandardMaterial
):void{
 const frames=SLOTS.map((slot,i)=>{
  const f=sampleHelmetCover(shell,slot.region,slot.u,slot.v,.105);
  if(!f)throw Error('H9.2 no textile buttonhole surface '+shell+' #'+i);
  const mount=surfaceMount(f);
  mount.name='ach-mich-sewn-buttonhole-'+i;
  mount.userData.h9SurfaceRegion=slot.region;
  addPiece(mount,slitCut,slitMaterial,'real-horizontal-foliage-slit',0,.018);
  for(const y of [-.11,.11])
   addPiece(mount,slitStitch,stitchMaterial,'reinforced-fabric-stitch',y,.023);
  for(const x of [-.75,.75]){
   const m=addPiece(mount,endStitch,stitchMaterial,'buttonhole-end-stitch',0,.027);
   m.position.x=x;
  }
  loops.add(mount);
  return f;
 });
 for(let i=0;i<SCRIM_SLOTS.length;i++){
  const slot=SCRIM_SLOTS[i],f=frames[slot];
  const mount=new THREE.Group();
  mount.name='h9-folded-scrim-mount-'+slot;
  mount.position.copy(f.position);
  // Local negative Y is GRAVITY. Cant local positive Y slightly inward,
  // so the free end falls outward and over the helmet shoulder.
  const up=f.up.clone().multiplyScalar(.77)
   .addScaledVector(f.normal,-.64).normalize();
  const right=f.right.clone();
  const outward=right.clone().cross(up).normalize();
  mount.quaternion.setFromRotationMatrix(new THREE.Matrix4()
   .makeBasis(right,up,outward));
  mount.rotateZ(LEAN[i]*.7);
  mount.userData.h9ScrimDownOut=true;
  mount.userData.h9SourceSlot=slot;
  const fabric=new THREE.Mesh(createPasgtScrimRibbonGeometry(i),
   i%3===0?tan:olive);
  fabric.name='pasgt-derived-folded-scrim';
  fabric.scale.setScalar(.58+(i%4)*.055);
  fabric.castShadow=false;fabric.receiveShadow=false;
  mount.add(fabric);scrim.add(mount);
 }
 for(let i=0;i<LEAF_SLOTS.length;i++){
  const slot=LEAF_SLOTS[i],f=frames[slot];
  const aim=f.normal.clone().multiplyScalar(.80+
   (i%3)*.08).addScaledVector(f.up,-(.65+(i%4)*.09)).normalize();
  // An authored card grows along its local +Y; bend that axis outward
  // and DOWN, not toward the sky as the H8 side foliage did.
  const right=f.right.clone();
  let facing=right.clone().cross(aim).normalize();
  if(facing.dot(f.normal)<0){
   right.negate();facing=right.clone().cross(aim).normalize();
  }
  const mount=new THREE.Group();
  mount.name='h9-outward-down-foliage-'+slot;
  mount.position.copy(f.position);
  mount.quaternion.setFromRotationMatrix(new THREE.Matrix4()
   .makeBasis(right,aim,facing));
  mount.rotateZ(LEAN[i]);
  mount.rotateY(i%2?.10:-.12);
  mount.userData.h9OutwardDown=[aim.x,aim.y,aim.z];
  mount.userData.h9Anchor=slot;
  const bunch=new THREE.Mesh(PASGT_LEAF_CLUSTERS[i%3],i%3===0?tan:olive);
  bunch.name='pasgt-derived-foliage';
  bunch.scale.setScalar(SCALE[i]);
  bunch.position.z=.12;
  bunch.castShadow=false;bunch.receiveShadow=false;
  // Keep the curated pieces independently visible for sparse/medium/heavy.
  bunch.userData.keepSeparate=true;
  mount.add(bunch);
  mount.userData.keepSeparate=true;
  leaves.add(mount);
 }
 loops.userData.h9SewnSlitCount=frames.length;
 scrim.userData.h9FoldedStrips=SCRIM_SLOTS.length;
 leaves.userData.h9FoliageAnchors=LEAF_SLOTS.length;
}
