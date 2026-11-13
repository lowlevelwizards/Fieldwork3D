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
 {region:'front',u:-.56,v:.30},
 {region:'front',u:.53,v:.22},
 {region:'back',u:-.57,v:.38},
 {region:'back',u:.60,v:.13},
 {region:'right',u:-.75,v:.44},
 {region:'right',u:-.27,v:.18},
 {region:'right',u:.35,v:.08},
 {region:'right',u:.77,v:.36},
 {region:'left',u:-.72,v:.15},
 {region:'left',u:-.21,v:.46},
 {region:'left',u:.39,v:.06},
 {region:'left',u:.76,v:.34}
];
// Occupancy order intentionally alternates side, brow and nape. Heavy
// foliage is NOT a mirrored hedge or a repeated planted-tree silhouette.
const LEAF_SLOTS=[4,9,2,0,7,10,5,1,8,11] as const;
const SCRIM_SLOTS=[0,8,5,11,1,4,9,7,3] as const;
const LEAN=[-.18,.11,-.24,.17,.08,-.13,.21,-.12,.16,-.08] as const;
const SCALE=[1.18,1.31,1.16,1.36,1.21,1.28,1.43,1.17,1.35,1.26] as const;
// H10.1: like the approved PASGT, a slit is a single matte, nearly
// coplanar dark buttonhole. Raised bright outlines read as neon at 2x zoom.
const slitMaterial=new THREE.MeshStandardMaterial({
 color:0x414a3c,roughness:1,metalness:0,side:THREE.DoubleSide
});
const slitCut=new THREE.PlaneGeometry(1.52,.215);
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
  mark(loops,f,slitCut,slitMaterial,'horizontal-fabric-buttonhole',0,0,.011);
  return f;
 });
 // Slightly lit two-sided fabric prevents edge-on back faces from
 // falling to near black in the Studio's strongly directional lighting.
 const oliveScrim=olive.clone(),tanScrim=tan.clone();
 oliveScrim.emissive.setHex(0x34402b);oliveScrim.emissiveIntensity=.12;
 tanScrim.emissive.setHex(0x53402d);tanScrim.emissiveIntensity=.10;
 for(let i=0;i<SCRIM_SLOTS.length;i++){
  const slot=SCRIM_SLOTS[i],f=frames[slot];
  // The free end extends along negative Y: orient positive Y inward and
  // upward so the fabric hangs OUTWARD and DOWN from its actual slit.
  const shortEdge=slot<4;
  const up=f.up.clone().multiplyScalar(shortEdge?.98:.87)
   .addScaledVector(f.normal,-(shortEdge?.18:.49)).normalize();
  const right=f.right.clone(),normal=right.clone().cross(up).normalize();
  const fabric=new THREE.Mesh(createPasgtScrimRibbonGeometry(i),
   i%3===0?tanScrim:oliveScrim);
  fabric.name='pasgt-derived-folded-scrim';
  fabric.position.copy(f.position);
  fabric.quaternion.copy(basis(right,up,normal));
  // Brow/nape strips should hang shorter and twist enough that their
  // folded cloth remains visible obliquely rather than a black needle.
  // Front and nape fabric need broad readable faces, not tiny twisted
  // needles. Side bands vary in length, width and lean by authored slot.
  const sideWidths=[.82,1.18,.73,1.04,.88,.68,1.16,.79,.98];
  const sideLengths=[.74,.88,.63,.91,.70,.82,.95,.67,.86];
  fabric.rotateZ(LEAN[i]*(shortEdge?.68:2.20));
  fabric.rotateY(shortEdge?(i%2?.12:-.16):
   [0.09,-.21,.26,-.08,.20,-.28,.06,.32,-.16][i]);
  fabric.scale.set(shortEdge?1.12+(i%2)*.12:sideWidths[i],
   shortEdge?.77+(i%3)*.07:sideLengths[i],
   shortEdge?.94:.79);
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
  const bunch=new THREE.Mesh(PASGT_LEAF_CLUSTERS[i%3],i%4===0?tan:olive);
  bunch.name='pasgt-derived-foliage';
  bunch.position.copy(f.position).addScaledVector(f.normal,.12);
  bunch.quaternion.copy(basis(right,aim,facing));
  bunch.rotateZ(LEAN[i]);bunch.rotateY(i%2?.10:-.12);
  bunch.scale.setScalar(SCALE[i]);
  bunch.castShadow=false;bunch.receiveShadow=false;
  bunch.userData.h9OutwardDown=[aim.x,aim.y,aim.z];
  bunch.userData.h9Anchor=SLOTS[slot];
  bunch.userData.keepSeparate=true;leaves.add(bunch);
 }
 loops.userData.h9SewnSlitCount=frames.length;
 scrim.userData.h9FoldedStrips=SCRIM_SLOTS.length;
 leaves.userData.h9FoliageAnchors=LEAF_SLOTS.length;
}
