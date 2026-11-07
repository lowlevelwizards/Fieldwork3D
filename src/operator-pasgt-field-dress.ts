/** PASGT P4-C field dress: every card and drape is attached to a real
 * foliage slit anchor. Stable authored orientations; no per-frame RNG.
 */
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {
 PASGT_SLIT_ANCHORS,createPasgtBandGeometry,
 PASGT_RING_SAMPLES,PASGT_COVER_TOP_Y,pasgtRingPoint,
 pasgtSlitAtlasUv,PASGT_ATLAS_WIDTH,PASGT_ATLAS_HEIGHT,
 type PasgtRingSample
} from './operator-pasgt-drape-geometry.ts';
import {resolvePasgtDetails,type PasgtDetails} from './operator-pasgt-cover-policy.ts';
import type {HeadwearCamoId} from './operator-headwear-camo.ts';

export type PasgtPalette='woodland'|'desert'|'urban';
export function pasgtConcealmentPalette(camo:HeadwearCamoId|undefined):PasgtPalette{
 const c=camo??'';
 if(/desert|arid|tropentarn|badlands|six-color|aor1|dpdu|highlander|tan/.test(c))
  return 'desert';
 if(/urban|ucp|gray|typhon|metropolis|black|abu/.test(c))
  return 'urban';
 return 'woodland';
}
const SCRIM_PALETTES:Record<PasgtPalette,readonly [number,number,number]>={
 woodland:[0xa69b7b,0x687454,0x93917a],
 desert:[0xc3aa7e,0x9b8868,0xd2bb93],
 urban:[0x98a095,0x6e786f,0xb0b2a4]
};
const PALETTES:Record<PasgtPalette,readonly [number,number,number]>={
 woodland:[0x526541,0x748054,0x95846a],
 desert:[0x968064,0xc0a77b,0x9e8b6c],
 urban:[0x62685f,0x848980,0x9a988e]
};
const material=(hex:number,side:THREE.Side=THREE.FrontSide)=>
 new THREE.MeshStandardMaterial({color:hex,roughness:1,flatShading:true,side});
const hidden=(parent:THREE.Group,name:string)=>{
 const g=new THREE.Group();g.name=name;g.visible=false;parent.add(g);return g;
};
/** Twelve bold cover-conforming fabric cuts, not protruding cubes.
 * The long axis follows local fabric tangent and each mark is above the
 * elastic rather than under it.
 */
export function createPasgtSlitGeometry():THREE.BufferGeometry{
 const p:number[]=[],rgb:number[]=[];
 const point=(a:(typeof PASGT_SLIT_ANCHORS)[number],s:number,h:number)=>{
  const [x,y,z]=a.position,[rx,ry,rz]=a.right,[ux,uy,uz]=a.up;
  return [x+s*rx+h*ux,y+s*ry+h*uy,z+s*rz+h*uz];
 };
 const add=(v:readonly number[])=>{
  p.push(v[0],v[1],v[2]);rgb.push(.45,.45,.45);
 };
 for(const a of PASGT_SLIT_ANCHORS){
  // Oversized slit marks remain a single, near-coplanar two-triangle
  // mark each. Scale and positioning do the work, never box geometry.
  const a0=point(a,-.83,.155),a1=point(a,.83,.155);
  const a2=point(a,.83,-.155),a3=point(a,-.83,-.155);
  for(const v of [a0,a1,a2,a0,a2,a3])add(v);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
 g.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.pasgtSlitCount=PASGT_SLIT_ANCHORS.length;
 g.userData.pasgtMountedOnCloth=true;
 return g;
}
function shapeGeometry(points:readonly (readonly [number,number])[]):THREE.ShapeGeometry{
 const shape=new THREE.Shape();
 for(let i=0;i<points.length;i++){
  const [x,y]=points[i];if(!i)shape.moveTo(x,y);else shape.lineTo(x,y);
 }
 shape.closePath();return new THREE.ShapeGeometry(shape);
}
/** Three visually different large pixel-art leaf silhouettes. Root at
 * (0,0) always enters a real cloth buttonhole; broad edges and flat faces
 * read clearly at normal gameplay distance. No tiny branch meshes.
 */
export const PASGT_LEAF_SHAPES:readonly THREE.ShapeGeometry[]=[
 // Broad, blunt iconic leaf masses; no long needle points.
 shapeGeometry([
  [-.28,-.12],[.28,-.12],[.40,.25],[.83,.49],
  [.65,.83],[.98,1.07],[.55,1.28],[.57,1.70],
  [.22,1.96],[-.20,1.91],[-.53,1.65],[-.56,1.29],
  [-.98,1.13],[-.72,.84],[-.85,.48],[-.34,.27]
 ]),
 shapeGeometry([
  [-.27,-.12],[.30,-.12],[.37,.21],[.82,.50],
  [.67,.89],[.98,1.13],[.53,1.35],[.63,1.72],
  [.27,2.08],[-.13,2.08],[-.55,1.69],[-.44,1.35],
  [-.95,1.12],[-.70,.84],[-.80,.53],[-.36,.21]
 ]),
 shapeGeometry([
  [-.31,-.12],[.28,-.12],[.43,.34],[.97,.63],
  [.78,1.00],[1.08,1.35],[.59,1.49],[.48,1.91],
  [.13,2.21],[-.33,1.99],[-.59,1.61],[-.99,1.45],
  [-.83,1.08],[-1.05,.73],[-.42,.37]
 ])
];
/** Three big, graphic leaf cards in ONE premerged cluster per slit.
 * A tall leaf, a lateral leaf and a purposely drooping leaf establish
 * asymmetry and visible downward angles without tiny botanical geometry.
 * Leaf bunches are authored and seeded by slot order, never per-frame.
 */
export const PASGT_LEAF_CLUSTERS:readonly THREE.BufferGeometry[]=
 PASGT_LEAF_SHAPES.map((shape,i)=>{
  const make=()=>shape.index?shape.toNonIndexed():shape.clone();
  const tall=make(),swept=make(),drooped=make();
  tall.applyMatrix4(new THREE.Matrix4().makeRotationY(i%2?.15:-.15)
   .multiply(new THREE.Matrix4().makeScale(1.27,1.22,1.27)));
  swept.applyMatrix4(new THREE.Matrix4()
   .makeTranslation(i%2?.28:-.28,.10,.08)
   .multiply(new THREE.Matrix4().makeRotationY(i%2?.72:-.72))
   .multiply(new THREE.Matrix4().makeRotationZ(i%2?-.67:.67))
   .multiply(new THREE.Matrix4().makeScale(.98,1.21,.98)));
  drooped.applyMatrix4(new THREE.Matrix4()
   .makeTranslation(i%2?.18:-.18,.06,.16)
   .multiply(new THREE.Matrix4().makeRotationY(i%2?-.44:.44))
   .multiply(new THREE.Matrix4().makeRotationZ(i%2?2.03:-2.03))
   .multiply(new THREE.Matrix4().makeScale(1.05,1.12,1.05)));
  const merged=mergeGeometries([tall,swept,drooped],false);
  tall.dispose();swept.dispose();drooped.dispose();
  if(!merged)throw Error('unable to merge iconic PASGT foliage bunch');
  merged.computeBoundingBox();
  merged.userData.pasgtCrossedPixelLeaf=true;
  merged.userData.pasgtBunchCardCount=3;
  return merged;
 });
/** Four triangles of broad, two-panel fabric with one angular fold,
 * rather than one needle-like dangling contour.
 * All strips are prebuilt; no per-frame cloth simulation.
 */
export function createPasgtScrimRibbonGeometry(style:number):THREE.BufferGeometry{
 const widths=[1.52,1.79,1.39,1.88],
  lengths=[3.35,2.72,3.65,3.04];
 const w=widths[style%widths.length],
  length=lengths[style%lengths.length];
 const halfway=length*.46,lower=length-halfway;
 const a=[-w/2,.12,-.055],b=[w/2,.12,-.055];
 const c=[w*.45,-halfway,.30],d=[-w*.55,-halfway,.30];
 // Deliberately twist the second broad face to read from side as fabric,
 // not an edge-on needle. Still one fold and two quad segments.
 const e=[-w*.54,-halfway-lower,.61],f=[w*.40,-halfway-lower,1.31];
 const vertices:number[]=[];
 const tri=(p:readonly number[],q:readonly number[],r:readonly number[])=>
  vertices.push(...p,...q,...r);
 tri(a,b,c);tri(a,c,d);
 tri(d,c,f);tri(d,f,e);
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.pasgtFoldedScrim=true;
 g.userData.pasgtSegmentCount=2;
 return g;
}
/** Ten curated clusters and strips, two clean unused slits.
 * The extra crown mounts let foliage break the miniature silhouette,
 * while a few lower side mounts let scrim drape over the brow and nape.
 */
const CARD_ANCHORS=[
 'front-left','crown-front-left','crown-front-right',
 'right-forward','right-aft','crown-rear-right',
 'rear-right','crown-rear-left','left-aft','left-forward'
] as const;
/** Local geometry always starts at its buttonhole. The 10 authored
 * variations are deliberately narrow: fabric behaves as cloth and leaf
 * clusters disrupt the outline, rather than random billboard rotations.
 */
const TILTS=[-.13,.10,-.08,.12,-.10,.09,-.11,.08,-.07,.10] as const;
const CARD_SCALES=[1.16,1.38,1.35,1.40,1.34,
 1.42,1.26,1.38,1.35,1.39] as const;
export function pasgtDecorationDirection(
 anchor:(typeof PASGT_SLIT_ANCHORS)[number],leaf:boolean):THREE.Vector3{
 const crown=anchor.id.startsWith('crown-');
 const outward=crown?
  new THREE.Vector3(anchor.position[0]*1.12,0,anchor.position[2]*.78).normalize():
  new THREE.Vector3(...anchor.normal).normalize();
 // The leaf's *positive* Y points outward, with the main card no longer
 // rising almost vertically like a plant. Side/back mounts tilt down.
 // Scrim local geometry extends along *negative* Y; gravity wins.
 return leaf?
  outward.multiplyScalar(crown?.90:.87)
   .add(new THREE.Vector3(0,crown?.35:-.49,0)).normalize():
  outward.multiplyScalar(crown?.70:.45)
   .add(new THREE.Vector3(0,-(crown?.72:.89),0)).normalize();
}
function placedCard(parent:THREE.Group,index:number,mat:THREE.Material,
 geometry:THREE.BufferGeometry,name:string,offsetY=0):void{
 const anchor=PASGT_SLIT_ANCHORS.find(s=>s.id===CARD_ANCHORS[index]);
 if(!anchor)throw Error('unknown PASGT slit '+CARD_ANCHORS[index]);
 const mount=new THREE.Group();
 mount.name=name+'-mount';
 mount.position.set(anchor.position[0],anchor.position[1],anchor.position[2]);
 mount.userData.pasgtSlitId=anchor.id;
 const leaf=name.includes('leaf'),crown=anchor.id.startsWith('crown-');
 const aim=pasgtDecorationDirection(anchor,leaf);
 // The mesh grows up for foliage and hangs down for scrim. Build a frame
 // that makes positive fold depth face away from the shell in both cases.
 const up=leaf?aim.clone():aim.clone().negate();
 let right:THREE.Vector3;
 if(crown){
  const radial=new THREE.Vector3(anchor.position[0],0,anchor.position[2]).normalize();
  right=new THREE.Vector3(radial.z,0,-radial.x);
 }else right=new THREE.Vector3(...anchor.right);
 right.addScaledVector(up,-right.dot(up)).normalize();
 let normal=right.clone().cross(up).normalize();
 const surfaceNormal=new THREE.Vector3(...anchor.normal);
 if(normal.dot(surfaceNormal)<0){
  // Preserve the material-facing side while still pointing toward the
  // exterior. Material is double-sided; rotating the tangent is cheaper
  // and less fragile than reversing individual card triangles.
  right.negate();normal=right.clone().cross(up).normalize();
 }
 const basis=new THREE.Matrix4().makeBasis(right,up,normal);
 mount.quaternion.setFromRotationMatrix(basis);
 mount.rotateZ(TILTS[index]);
 // Deliberate small out-of-plane irregularity, not arbitrary full spins.
 mount.rotateY(index%2?.10:-.10);
 // Store semantic direction for narrow geometry acceptance tests.
 mount.userData.pasgtPrimaryWorldDirection=[aim.x,aim.y,aim.z];
 const card=new THREE.Mesh(geometry,mat);
 card.position.z=leaf?.13:.22;
 card.position.y=offsetY;
 if(leaf)card.scale.setScalar(CARD_SCALES[index]);
 else if(anchor.id==='front-left')card.scale.setScalar(.82);
 card.name=name;card.castShadow=true;card.receiveShadow=false;
 mount.add(card);parent.add(mount);
}
/** P5-F — six sparse, diagonal strands, clipped to the real crown rectangle,
 * then draped over the shoulder and partially down the front/ear/nape.
 * Opposing directions form diamonds, not a 3x3 square basket.
 */
const crownX=Math.abs(PASGT_RING_SAMPLES.find(s=>s.side==='front')!.x);
const crownFront=PASGT_RING_SAMPLES.find(s=>s.side==='front')!.z;
const crownRear=PASGT_RING_SAMPLES.find(s=>s.side==='rear')!.z;
type NetEdge={x:number;z:number;side:'front'|'rear'|'left'|'right'};
function clippedNetLine(slope:number,shift:number):readonly [NetEdge,NetEdge]{
 const candidates:NetEdge[]=[];
 for(const z of [crownFront,crownRear]){
  const x=slope*z+shift;
  if(x>=-crownX-.0001&&x<=crownX+.0001)
   candidates.push({x,z,side:z===crownFront?'front':'rear'});
 }
 for(const x of [-crownX,crownX]){
  const z=(x-shift)/slope;
  if(z>=crownFront-.0001&&z<=crownRear+.0001)
   candidates.push({x,z,side:x<0?'left':'right'});
 }
 candidates.sort((a,b)=>a.z-b.z);
 const unique=candidates.filter((a,i)=>!candidates.slice(0,i).some(b=>
  Math.hypot(b.x-a.x,b.z-a.z)<.001));
 if(unique.length<2)throw Error('PASGT diamond strand did not reach rim');
 return [unique[0],unique.at(-1)!];
}
function sampleOnEdge(edge:NetEdge):PasgtRingSample{
 const sample=PASGT_RING_SAMPLES.filter(s=>s.side===edge.side);
 const axis=edge.side==='left'||edge.side==='right'?'z':'x';
 const near=[...sample].sort((a,b)=>
  Math.abs(a[axis]-edge[axis])-Math.abs(b[axis]-edge[axis]));
 const a=near[0],b=near[1]??near[0];
 const t=Math.abs(a[axis]-b[axis])<.001?0:
  Math.max(0,Math.min(1,(edge[axis]-a[axis])/(b[axis]-a[axis])));
 return {
  side:edge.side,x:edge.x,z:edge.z,
  bottomY:a.bottomY+(b.bottomY-a.bottomY)*t,distance:0
 };
}
function netDrape(edge:NetEdge):readonly (readonly number[])[]{
 const s=sampleOnEdge(edge);
 const outward=s.side==='front'?[0,0,-1]:
  s.side==='rear'?[0,0,1]:
  s.side==='right'?[1,0,0]:[-1,0,0];
 const along=(s.side==='front'||s.side==='rear')?
  (edge.x<0?1:-1):(edge.z<0?1:-1);
 const shift=(p:readonly number[],distance:number)=>{
  const v=p.map((n,i)=>n+outward[i]*.10);
  if(s.side==='front'||s.side==='rear')v[0]+=along*distance;
  else v[2]+=along*distance;
  return v;
 };
 const shoulder=shift(pasgtRingPoint(s,'shoulder'),.10);
 const ramp=shift(pasgtRingPoint(s,'ramp'),.12);
 const hem=pasgtRingPoint(s,'hem');
 // Net is gathered into the elastic height instead of dangling down
 // as a set of unsupported external poles.
 const t=Math.max(0,Math.min(1,(ramp[1]-5.43)/(ramp[1]-hem[1])));
 const lowerUnshifted=ramp.map((v,i)=>v*(1-t)+hem[i]*t);
 const lower=shift(lowerUnshifted,.32);
 // Tuck the final portion beneath the fabric band so it reads as held,
 // rather than as six wires standing on top of a rim.
 const outwardContact=new THREE.Vector3(outward[0],outward[1],outward[2]).multiplyScalar(.09);
 lower[0]-=outwardContact.x;
 lower[2]-=outwardContact.z;
 // The fabric net wraps off the crown and diagonally across the shoulder.
 // Terminate at the retaining-band level instead of making long vertical
 // roof-trellis supports that hang into the nape/ear gap.
 return [
  lower,ramp,shoulder,
  [edge.x,PASGT_COVER_TOP_Y+.09,edge.z]
 ];
}
/** Each segment has a narrow quad aligned with its local cloth surface.
 * The across-tangent vector is computed in 3D, so cords remain flat at
 * slopes and do not become thick vertical ladder supports.
 */
function appendNetRibbon(out:number[],
 path:readonly (readonly number[])[],width=.22):void{
 const vec=(p:readonly number[])=>new THREE.Vector3(p[0],p[1],p[2]);
 const add=(p:THREE.Vector3)=>out.push(p.x,p.y,p.z);
 for(let i=0;i<path.length-1;i++){
  const p=vec(path[i]),q=vec(path[i+1]);
  const tangent=q.clone().sub(p).normalize();
  const middle=p.clone().add(q).multiplyScalar(.5);
  const normal=(middle.y>PASGT_COVER_TOP_Y-.15&&
   p.y>PASGT_COVER_TOP_Y-.15&&q.y>PASGT_COVER_TOP_Y-.15)?
   new THREE.Vector3(0,1,0):
   Math.abs(middle.x)>crownX-.1?new THREE.Vector3(Math.sign(middle.x),0,0):
   new THREE.Vector3(0,0,middle.z<0?-1:1);
  const across=new THREE.Vector3().crossVectors(normal,tangent).normalize()
   .multiplyScalar(width/2);
  const a=p.clone().sub(across),b=p.clone().add(across),
   c=q.clone().add(across),d=q.clone().sub(across);
  for(const v of [a,b,c,a,c,d])add(v);
 }
}
export function createPasgtNetGeometry():THREE.BufferGeometry{
 const coordinates:number[]=[];
 // Three large openings in each diagonal direction. Slightly irregular
 // separation and two broad angling decisions prevent a rigid roof grid.
 const slopes=[-.69,.74] as const;
 for(const slope of slopes)for(const shift of [-3.9,.24,3.73]){
  const [a,b]=clippedNetLine(slope,shift);
  const start=netDrape(a),end=netDrape(b);
  const center1:[number,number,number]=[
   (2*a.x+b.x)/3+.26*Math.sign(slope),
   PASGT_COVER_TOP_Y+.085,
   (2*a.z+b.z)/3-.23];
  const center2:[number,number,number]=[
   (a.x+2*b.x)/3-.16*Math.sign(slope),
   PASGT_COVER_TOP_Y+.085,
   (a.z+2*b.z)/3+.19];
  const path=[...start,center1,center2,...[...end].reverse()];
  appendNetRibbon(coordinates,path,.31);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(coordinates,3));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.pasgtNetFullDrape=true;
 g.userData.pasgtNetCordCount=6;
 g.userData.pasgtNetPattern='sparse-diamond';
 g.userData.pasgtNetCoverContact=true;
 g.userData.pasgtNetTuckedUnderBand=true;
 return g;
}
/** Oversized two-point retention. Three graphic shapes, no hardware.
 * The low cheek/chin straps make the helmet look worn, but remain hidden
 * when bulky facewear would produce broken overlaps.
 */
export function createPasgtRetentionGeometry():THREE.BufferGeometry{
 const data:number[]=[];
 const vec=(p:readonly number[])=>new THREE.Vector3(p[0],p[1],p[2]);
 const put=(p:THREE.Vector3)=>data.push(p.x,p.y,p.z);
 for(const sign of [-1,1] as const){
  const path=[
   vec([sign*4.99,3.30,-1.12]),
   vec([sign*4.22,1.32,-4.23]),
   vec([sign*2.34,-.13,-4.31])
  ];
  const normal=new THREE.Vector3(sign*.68,0,-.74);
  for(let i=0;i<path.length-1;i++){
   const p=path[i],q=path[i+1];
   const tangent=q.clone().sub(p).normalize();
   const across=new THREE.Vector3().crossVectors(normal,tangent)
    .normalize().multiplyScalar(.39);
   const a=p.clone().add(across),b=p.clone().sub(across),
    c=q.clone().sub(across),d=q.clone().add(across);
   for(const pt of [a,b,c,a,c,d])put(pt);
  }
 }
 const pad=[
  vec([-2.34,-.46,-4.34]),vec([2.34,-.46,-4.34]),
  vec([2.34,.15,-4.34]),vec([-2.34,.15,-4.34])
 ];
 for(const i of [0,1,2,0,2,3])put(pad[i]);
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(data,3));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.pasgtSimpleTwoPointRetention=true;
 return g;
}
/** A shallow two-facet insert gives the flat PASGT chin cup a little
 * fabric depth without turning the existing broad strap into jaw armor.
 * Retention remains hidden for bulky facewear exactly as before.
 */
export function createPasgtChinCupInsetGeometry():THREE.BufferGeometry{
 const p:number[]=[];
 const left=[-1.65,-.32,-4.385],mid=[0,-.37,-4.44],
  right=[1.65,-.32,-4.385];
 const upperLeft=[-1.65,.025,-4.385],upperMid=[0,.045,-4.44],
  upperRight=[1.65,.025,-4.385];
 for(const v of [left,mid,upperMid,left,upperMid,upperLeft,
  mid,right,upperRight,mid,upperRight,upperMid])p.push(...v);
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.pasgtShallowChinCup=true;
 return g;
}
/** Two broad rear cat-eye marks live on the existing elastic profile.
 * They're printed-looking flat strips: no tiny buckle or separate control.
 */
export function createPasgtCatEyesGeometry(covered:boolean):THREE.BufferGeometry{
 const back=PASGT_RING_SAMPLES.find(s=>s.side==='rear')!;
 const z=pasgtRingPoint(back,'ramp')[2]+(covered?.15:-.005);
 const data:number[]=[];
 for(const x of [-2.10,2.10]){
  const a=[x-.62,5.70,z],b=[x+.62,5.70,z],
   c=[x+.62,5.34,z],d=[x-.62,5.34,z];
  for(const p of [a,b,c,a,c,d])data.push(...p);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(data,3));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.pasgtRearCatEyes=2;
 return g;
}
export type PasgtFieldDressLayers={
 slits:THREE.Group;band:THREE.Group;retention:THREE.Group;
 foliage:THREE.Group;scrim:THREE.Group;net:THREE.Group;
 leafMaterials:readonly THREE.MeshStandardMaterial[];
 scrimMaterials:readonly THREE.MeshStandardMaterial[];
 palette:PasgtPalette|null;
 slitPrint:THREE.DataTexture|null;
};
export function createPasgtFieldDress(parent:THREE.Group):PasgtFieldDressLayers{
 const slits=hidden(parent,'pasgt-twelve-bold-buttonholes');
 const band=hidden(parent,'pasgt-one-chunky-elastic');
 const retention=hidden(parent,'pasgt-two-point-retention');
 const foliage=hidden(parent,'pasgt-leaves-from-buttonholes');
 const scrim=hidden(parent,'pasgt-fabric-strips-from-buttonholes');
 const net=hidden(parent,'pasgt-full-shell-overnet');
 const slitMat=new THREE.MeshStandardMaterial({
  color:0xffffff,vertexColors:true,roughness:1,
  flatShading:true,side:THREE.DoubleSide
 }),bandMat=material(0x5a6650);
 const leafMaterials=[material(0x536341,THREE.DoubleSide),
  material(0x778054,THREE.DoubleSide),material(0x98906b,THREE.DoubleSide)];
 const scrimMaterials=[material(0x536341,THREE.DoubleSide),
  material(0x778054,THREE.DoubleSide),material(0x98906b,THREE.DoubleSide)];
 // The cuts share the cover's true normal/tangent frames. One flat mesh,
 // rather than eight black boxes and a second shadow-receiving surface.
 const slitMesh=new THREE.Mesh(createPasgtSlitGeometry(),slitMat);
 slitMesh.name='pasgt-twelve-panel-tangent-buttonholes';
 slitMesh.castShadow=false;slitMesh.receiveShadow=false;
 slits.add(slitMesh);
 for(const covered of [true,false]){
  const bandMesh=new THREE.Mesh(createPasgtBandGeometry(covered),bandMat);
  bandMesh.name=covered?'pasgt-covered-fit-elastic':'pasgt-bare-fit-elastic';
  bandMesh.castShadow=true;bandMesh.receiveShadow=false;
  bandMesh.visible=covered;
  const marks=new THREE.Mesh(createPasgtCatEyesGeometry(covered),
   material(0xbfb28e,THREE.DoubleSide));
  marks.name='pasgt-two-rear-cat-eye-tabs';
  marks.castShadow=false;marks.receiveShadow=false;
  bandMesh.add(marks);band.add(bandMesh);
 }
 for(let i=0;i<CARD_ANCHORS.length;i++){
  placedCard(foliage,i,leafMaterials[i%3],
   PASGT_LEAF_CLUSTERS[i%PASGT_LEAF_CLUSTERS.length],
   'pasgt-iconic-forked-leaf',-.10);
  placedCard(scrim,i,scrimMaterials[i%3],
   createPasgtScrimRibbonGeometry(i),
   'pasgt-broad-folded-cloth-strip',-.09);
 }
 const strap=new THREE.Mesh(createPasgtRetentionGeometry(),
  material(0x58644e,THREE.DoubleSide));
 strap.name='pasgt-chunky-two-point-retention';
 strap.castShadow=true;strap.receiveShadow=false;
 retention.add(strap);
 const cup=new THREE.Mesh(createPasgtChinCupInsetGeometry(),
  material(0x717b62,THREE.DoubleSide));
 cup.name='pasgt-shallow-chin-cup-inset';
 cup.castShadow=false;cup.receiveShadow=false;
 retention.add(cup);
 const netMat=material(0x78816a,THREE.DoubleSide);
 const netMesh=new THREE.Mesh(createPasgtNetGeometry(),netMat);
 netMesh.name='pasgt-front-crown-side-rear-net';netMesh.castShadow=true;
 netMesh.receiveShadow=false;net.add(netMesh);
 return {slits,band,retention,foliage,scrim,net,
  leafMaterials,scrimMaterials,palette:null,slitPrint:null};
}
/** Each flat buttonhole matches the RGB of its exact printed cover atlas.
 * The geometry is fully opaque; recolor at print-change time only.
 */
export function updatePasgtSlitShading(v:PasgtFieldDressLayers,
 texture:THREE.DataTexture):void{
 if(v.slitPrint===texture)return;
 const mesh=v.slits.children[0] as THREE.Mesh;
 const colors=mesh.geometry.getAttribute('color') as THREE.BufferAttribute;
 const pixels=texture.image.data as Uint8Array;
 for(let i=0;i<PASGT_SLIT_ANCHORS.length;i++){
  const uv=pasgtSlitAtlasUv(PASGT_SLIT_ANCHORS[i]);
  const x=Math.max(0,Math.min(PASGT_ATLAS_WIDTH-1,
   Math.round(uv[0]*PASGT_ATLAS_WIDTH-.5)));
  const y=Math.max(0,Math.min(PASGT_ATLAS_HEIGHT-1,
   Math.round(uv[1]*PASGT_ATLAS_HEIGHT-.5)));
  const idx=(y*PASGT_ATLAS_WIDTH+x)*4;
  if(pixels[idx+3]!==255)throw Error('PASGT slit sampled atlas gutter');
  const tint=new THREE.Color().setRGB(
   pixels[idx]/255,pixels[idx+1]/255,pixels[idx+2]/255,
   THREE.SRGBColorSpace).multiplyScalar(.84);
  for(let j=0;j<6;j++)colors.setXYZ(i*6+j,tint.r,tint.g,tint.b);
 }
 colors.needsUpdate=true;v.slitPrint=texture;
}
export function updatePasgtFieldDress(v:PasgtFieldDressLayers,
 covered:boolean,details:PasgtDetails,camo:HeadwearCamoId|undefined,
 allowRetention=true):void{
 const effective=resolvePasgtDetails(details,undefined,covered);
 v.slits.visible=covered&&effective.slits;
 v.band.visible=effective.band==='elastic'; // can be worn over the bare shell
 // Both contours are prebuilt once. Never place a single halfway-floating
 // band between hard shell and cloth cover.
 for(const mesh of v.band.children)mesh.visible=
  mesh.name===(covered?'pasgt-covered-fit-elastic':'pasgt-bare-fit-elastic');
 v.foliage.visible=covered&&effective.concealment==='foliage';
 v.scrim.visible=covered&&effective.concealment==='scrim';
 v.net.visible=covered&&effective.concealment==='net';
 v.retention.visible=allowRetention;
 const palette=pasgtConcealmentPalette(camo);
 if(v.palette!==palette){
  const colors=PALETTES[palette];
  for(let i=0;i<3;i++){
   v.leafMaterials[i].color.setHex(colors[i]);
   v.scrimMaterials[i].color.setHex(SCRIM_PALETTES[palette][i]);
  }
  v.palette=palette;
 }
}
