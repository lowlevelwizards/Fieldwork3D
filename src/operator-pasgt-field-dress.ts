/** PASGT P4-C field dress: every card and drape is attached to a real
 * foliage slit anchor. Stable authored orientations; no per-frame RNG.
 */
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {
 PASGT_SLIT_ANCHORS,createPasgtBandGeometry,
 PASGT_RING_SAMPLES,PASGT_COVER_TOP_Y,pasgtRingPoint,
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
/** Single near-coplanar eight-cut marking mesh, not protruding cubes.
 * The long axis follows local fabric tangent and each mark is above the
 * elastic rather than under it.
 */
export function createPasgtSlitGeometry():THREE.BufferGeometry{
 const p:number[]=[];
 const point=(a:(typeof PASGT_SLIT_ANCHORS)[number],s:number,h:number)=>{
  const [x,y,z]=a.position,[rx,ry,rz]=a.right,[ux,uy,uz]=a.up;
  return [x+s*rx+h*ux,y+s*ry+h*uy,z+s*rz+h*uz];
 };
 const add=(v:readonly number[])=>p.push(v[0],v[1],v[2]);
 for(const a of PASGT_SLIT_ANCHORS){
  const a0=point(a,-.53,.07),a1=point(a,.53,.07);
  const a2=point(a,.53,-.07),a3=point(a,-.53,-.07);
  for(const v of [a0,a1,a2,a0,a2,a3])add(v);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
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
 shapeGeometry([
  [-.13,-.08],[.16,0],[.34,.37],[.67,.68],[.43,.94],
  [.59,1.30],[.22,1.87],[.01,2.23],[-.26,1.66],
  [-.57,1.46],[-.40,1.08],[-.62,.81],[-.24,.40]
 ]),
 shapeGeometry([
  [-.12,-.08],[.12,0],[.25,.49],[.42,.85],[.19,1.25],
  [.29,1.69],[.02,2.41],[-.20,1.63],[-.29,1.21],
  [-.48,.83],[-.26,.56]
 ]),
 shapeGeometry([
  [-.12,-.08],[.19,0],[.30,.47],[.85,.88],[.66,1.16],
  [.33,1.04],[.47,1.56],[.18,1.90],[-.05,1.62],
  [-.29,2.04],[-.54,1.68],[-.29,1.19],[-.78,1.30],
  [-.91,1.04],[-.40,.65]
 ])
];
/** Two crossed planar cards make a single recognizable foliage cluster
 * from more than one camera angle, at the cost of only ONE draw call per
 * root. No curved leaves, tiny stems or independent mini-branch pieces.
 */
export const PASGT_LEAF_CLUSTERS:readonly THREE.BufferGeometry[]=
 PASGT_LEAF_SHAPES.map((shape,i)=>{
  const front=shape.index?shape.toNonIndexed():shape.clone();
  const crossed=shape.index?shape.toNonIndexed():shape.clone();
  crossed.applyMatrix4(new THREE.Matrix4()
   .makeTranslation(i%2?.20:-.20,.13,.035)
   .multiply(new THREE.Matrix4().makeRotationY(i%2?.60:-.60))
   .multiply(new THREE.Matrix4().makeScale(.82,.91,.82)));
  const merged=mergeGeometries([front,crossed],false);
  front.dispose();crossed.dispose();
  if(!merged)throw Error('unable to merge PASGT crossed leaf cards');
  merged.computeBoundingBox();
  merged.userData.pasgtCrossedPixelLeaf=true;
  return merged;
 });
/** Four triangles of broad, two-panel fabric with one angular fold,
 * rather than one needle-like dangling contour.
 * All strips are prebuilt; no per-frame cloth simulation.
 */
export function createPasgtScrimRibbonGeometry(style:number):THREE.BufferGeometry{
 const widths=[1.04,1.17,.95],lengths=[1.75,2.10,1.91];
 const w=widths[style%widths.length],
  length=lengths[style%lengths.length];
 const halfway=length*.42,lower=length-halfway;
 const a=[-w/2,.12,-.055],b=[w/2,.12,-.055];
 const c=[w*.45,-halfway,.18],d=[-w*.55,-halfway,.18];
 const e=[-w*.49,-halfway-lower,.53],f=[w*.38,-halfway-lower,.53];
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
const CARD_ANCHORS=['front-left','right-forward','right-aft',
 'rear-right','left-aft','left-forward'] as const;
const TILTS=[-.21,.17,-.10,.24,-.18,.13] as const;
function placedCard(parent:THREE.Group,index:number,mat:THREE.Material,
 geometry:THREE.BufferGeometry,name:string,offsetY=0):void{
 const anchor=PASGT_SLIT_ANCHORS.find(s=>s.id===CARD_ANCHORS[index]);
 if(!anchor)throw Error('unknown PASGT slit '+CARD_ANCHORS[index]);
 const mount=new THREE.Group();
 mount.name=name+'-mount';
 mount.position.set(anchor.position[0],anchor.position[1],anchor.position[2]);
 mount.userData.pasgtSlitId=anchor.id;
 // The root is tangent to the fabric, but vegetation grows mostly
 // upright while hanging textiles fall vertically. A fully tangent card
 // disappeared into the cover in front/side views and never broke its rim.
 const leaf=name.includes('leaf');
 const right=new THREE.Vector3(...anchor.right);
 const up=new THREE.Vector3(...anchor.up).lerp(
  new THREE.Vector3(0,1,0),leaf?.83:.60).normalize();
 up.addScaledVector(right,-right.dot(up)).normalize();
 const normal=right.clone().cross(up).normalize();
 const basis=new THREE.Matrix4().makeBasis(right,up,normal);
 mount.quaternion.setFromRotationMatrix(basis);
 mount.rotateZ(TILTS[index]);mount.rotateX(leaf?.17:-.10);
 // Keep the mount root exactly at its slit and offset only card geometry.
 const card=new THREE.Mesh(geometry,mat);
 if(leaf){
  const size=[1.16,1.36,1.07,1.27,1.38,1.14][index];
  card.scale.setScalar(size);
  card.position.z=.07;
 }
 card.position.y=offsetY;
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
 const shoulder=shift(pasgtRingPoint(s,'shoulder'),.18);
 const ramp=shift(pasgtRingPoint(s,'ramp'),.59);
 const hem=pasgtRingPoint(s,'hem');
 const lowerUnshifted=ramp.map((v,i)=>.73*v+.27*hem[i]);
 const lower=shift(lowerUnshifted,.97);
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
 const slopes=[-.64,.64] as const;
 for(const slope of slopes)for(const shift of [-4,0,4]){
  const [a,b]=clippedNetLine(slope,shift);
  const start=netDrape(a),end=netDrape(b);
  const path=[...start,...[...end].reverse()];
  appendNetRibbon(coordinates,path,.25);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(coordinates,3));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.pasgtNetFullDrape=true;
 g.userData.pasgtNetCordCount=6;
 g.userData.pasgtNetPattern='sparse-diamond';
 return g;
}
export type PasgtFieldDressLayers={
 slits:THREE.Group;band:THREE.Group;
 foliage:THREE.Group;scrim:THREE.Group;net:THREE.Group;
 leafMaterials:readonly THREE.MeshStandardMaterial[];
 scrimMaterials:readonly THREE.MeshStandardMaterial[];
 palette:PasgtPalette|null;
};
export function createPasgtFieldDress(parent:THREE.Group):PasgtFieldDressLayers{
 const slits=hidden(parent,'pasgt-eight-buttonholes');
 const band=hidden(parent,'pasgt-one-chunky-elastic');
 const foliage=hidden(parent,'pasgt-leaves-from-buttonholes');
 const scrim=hidden(parent,'pasgt-fabric-strips-from-buttonholes');
 const net=hidden(parent,'pasgt-full-shell-overnet');
 const slitMat=material(0x49513f,THREE.DoubleSide),bandMat=material(0x5a6650);
 const leafMaterials=[material(0x536341,THREE.DoubleSide),
  material(0x778054,THREE.DoubleSide),material(0x98906b,THREE.DoubleSide)];
 const scrimMaterials=[material(0x536341,THREE.DoubleSide),
  material(0x778054,THREE.DoubleSide),material(0x98906b,THREE.DoubleSide)];
 // The cuts share the cover's true normal/tangent frames. One flat mesh,
 // rather than eight black boxes and a second shadow-receiving surface.
 const slitMesh=new THREE.Mesh(createPasgtSlitGeometry(),slitMat);
 slitMesh.name='pasgt-eight-panel-tangent-buttonholes';
 slitMesh.castShadow=false;slitMesh.receiveShadow=false;
 slits.add(slitMesh);
 for(const covered of [true,false]){
  const bandMesh=new THREE.Mesh(createPasgtBandGeometry(covered),bandMat);
  bandMesh.name=covered?'pasgt-covered-fit-elastic':'pasgt-bare-fit-elastic';
  bandMesh.castShadow=true;bandMesh.receiveShadow=false;
  bandMesh.visible=covered;band.add(bandMesh);
 }
 for(let i=0;i<CARD_ANCHORS.length;i++){
  placedCard(foliage,i,leafMaterials[i%3],
   PASGT_LEAF_CLUSTERS[i%PASGT_LEAF_CLUSTERS.length],
   'pasgt-iconic-forked-leaf',-.10);
  placedCard(scrim,i,scrimMaterials[i%3],
   createPasgtScrimRibbonGeometry(i),
   'pasgt-broad-folded-cloth-strip',-.09);
 }
 const netMat=material(0x636e53,THREE.DoubleSide);
 const netMesh=new THREE.Mesh(createPasgtNetGeometry(),netMat);
 netMesh.name='pasgt-front-crown-side-rear-net';netMesh.castShadow=true;
 netMesh.receiveShadow=false;net.add(netMesh);
 return {slits,band,foliage,scrim,net,
  leafMaterials,scrimMaterials,palette:null};
}
export function updatePasgtFieldDress(v:PasgtFieldDressLayers,
 covered:boolean,details:PasgtDetails,camo:HeadwearCamoId|undefined):void{
 const effective=resolvePasgtDetails(details);
 v.slits.visible=covered&&effective.slits;
 v.band.visible=effective.band==='elastic'; // can be worn over the bare shell
 // Both contours are prebuilt once. Never place a single halfway-floating
 // band between hard shell and cloth cover.
 for(const mesh of v.band.children)mesh.visible=
  mesh.name===(covered?'pasgt-covered-fit-elastic':'pasgt-bare-fit-elastic');
 v.foliage.visible=covered&&effective.concealment==='foliage';
 v.scrim.visible=covered&&effective.concealment==='scrim';
 v.net.visible=covered&&effective.concealment==='net';
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
