/** R4 fitted, low-piece-count armor geometry.
 * One mesh per shoulder bridge / side closure, rather than disconnected
 * world-axis boxes. Cloth faces keep world-unit repeat UVs and flat edges.
 * All shapes are visual-only and built only when the outfit changes.
 */
import * as THREE from 'three';
import {TILE_WORLD_SIZE} from './rendering/pixel-materials.ts';
import {bakeGearGeometryAO} from './operator-baked-gear-ao.ts';

type XYZ=readonly [number,number,number];
type XZ=readonly [number,number];
const pixelUV=(g:THREE.BufferGeometry)=>{
 const uv=g.getAttribute('uv');
 if(uv)for(let i=0;i<uv.count;i++)
  uv.setXY(i,uv.getX(i)/TILE_WORLD_SIZE,uv.getY(i)/TILE_WORLD_SIZE);
 return g;
};
function rawStrip(rings:readonly (readonly [XYZ,XYZ,XYZ,XYZ])[],
 material:THREE.Material,group:THREE.Group,name:string):THREE.Mesh{
 const points:number[]=[],uv:number[]=[];
 const metric=(a:XYZ,b:XYZ)=>Math.hypot(
  a[0]-b[0],a[1]-b[1],a[2]-b[2]);
 const center=(r:readonly [XYZ,XYZ,XYZ,XYZ]):XYZ=>[
  (r[0][0]+r[1][0]+r[2][0]+r[3][0])*.25,
  (r[0][1]+r[1][1]+r[2][1]+r[3][1])*.25,
  (r[0][2]+r[1][2]+r[2][2]+r[3][2])*.25
 ];
 const distances=[0];
 for(let i=1;i<rings.length;i++)
  distances.push(distances[i-1]+metric(center(rings[i-1]),center(rings[i])));
 const tri=(a:XYZ,b:XYZ,c:XYZ,
  ta:readonly [number,number],tb:readonly [number,number],
  tc:readonly [number,number])=>{
  // Two winding orientations permit the same low-poly mesh to serve
  // mirrored sides and undersurfaces without global DoubleSide materials.
  points.push(...a,...b,...c,...c,...b,...a);
  uv.push(...ta,...tb,...tc,...tc,...tb,...ta);
 };
 for(let i=0;i<rings.length-1;i++){
  const a=rings[i],b=rings[i+1],
   u0=distances[i]/TILE_WORLD_SIZE,
   u1=distances[i+1]/TILE_WORLD_SIZE;
  // Metric UVs: no enlarged pixels when a shoulder bend gets longer.
  for(const [l,r] of [[0,1],[2,3],[0,2],[1,3]] as const){
   const width=metric(a[l],a[r])/TILE_WORLD_SIZE;
   tri(a[l],a[r],b[r],[u0,0],[u0,width],[u1,width]);
   tri(a[l],b[r],b[l],[u0,0],[u1,width],[u1,0]);
  }
 }
 for(const cap of [rings[0],rings[rings.length-1]]){
  const u=metric(cap[0],cap[1])/TILE_WORLD_SIZE;
  const v=metric(cap[0],cap[2])/TILE_WORLD_SIZE;
  tri(cap[0],cap[2],cap[3],[0,0],[0,v],[u,v]);
  tri(cap[0],cap[3],cap[1],[0,0],[u,v],[u,0]);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geo.computeVertexNormals();
 bakeGearGeometryAO(geo,material);
 const mesh=new THREE.Mesh(geo,material);
 mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
 group.add(mesh);return mesh;
}
/** A broad, continuous strap draped over the shoulder from the upper
 * front bag to the rear. The thickness follows the X/Y surface normal,
 * not a world-aligned vertical extrusion; thus the crown lies flat.
 */
export function fittedShoulderBridge(group:THREE.Group,m:THREE.Material,
 path:readonly XYZ[],width:number,thickness:number,side:number){
 const rings:[XYZ,XYZ,XYZ,XYZ][]=[];
 for(let i=0;i<path.length;i++){
  const p=path[i],a=path[Math.max(0,i-1)],
   b=path[Math.min(path.length-1,i+1)];
  const tx=b[0]-a[0],ty=b[1]-a[1],
   len=Math.hypot(tx,ty)||1,nx=ty/len,ny=-tx/len;
  const t=thickness*.5,z=p[2]*side,w=width*.5;
  rings.push([
   [p[0]+nx*t,p[1]+ny*t,z-w],
   [p[0]+nx*t,p[1]+ny*t,z+w],
   [p[0]-nx*t,p[1]-ny*t,z-w],
   [p[0]-nx*t,p[1]-ny*t,z+w]
  ]);
 }
 return rawStrip(rings,m,group,'fitted-flat-shoulder-bridge');
}
/** A single upright band sweeps around the garment flank in X/Z.
 * Front/rear ends overlap the plate seams. Horizontal outboard beams and
 * detached connection tabs are impossible with this construction.
 */
export function fittedSideWrap(group:THREE.Group,m:THREE.Material,
 path:readonly XZ[],y:number,height:number,thickness:number,side:number){
 const rings:[XYZ,XYZ,XYZ,XYZ][]=[];
 for(let i=0;i<path.length;i++){
  const p=path[i],a=path[Math.max(0,i-1)],
   b=path[Math.min(path.length-1,i+1)];
  const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz)||1;
  const nx=side*dz/len,nz=side*(-dx)/len;
  const t=thickness*.5;
  rings.push([
   [p[0]+nx*t,y+height*.5,p[1]+nz*t],
   [p[0]-nx*t,y+height*.5,p[1]-nz*t],
   [p[0]+nx*t,y-height*.5,p[1]+nz*t],
   [p[0]-nx*t,y-height*.5,p[1]-nz*t]
  ]);
 }
 return rawStrip(rings,m,group,'fitted-flat-side-wrap');
}
/** R5: a flat webbing strip whose WIDE face follows an explicit contact
 * normal. Generic segment-to-segment quaternion alignment leaves the width
 * axis arbitrary and makes diagonal/vertical straps stand edge-on.
 * Caller supplies one OUTWARD contact normal per path point, including
 * transitions from back to shoulder to side. No per-frame geometry updates.
 */
export function fittedFlatSurfaceBand(group:THREE.Group,m:THREE.Material,
 path:readonly XYZ[],normals:readonly XYZ[],
 width:number,thickness:number){
 if(path.length<2||path.length!==normals.length)
  throw new Error('surface webbing requires a normal at every route point');
 const rings:[XYZ,XYZ,XYZ,XYZ][]=[];
 let previousWidth:THREE.Vector3|undefined;
 for(let i=0;i<path.length;i++){
  const center=new THREE.Vector3(...path[i]);
  const a=new THREE.Vector3(...path[Math.max(0,i-1)]);
  const b=new THREE.Vector3(...path[Math.min(path.length-1,i+1)]);
  const tangent=b.sub(a);
  if(tangent.lengthSq()<1e-8)throw new Error('zero-length webbing route');
  tangent.normalize();
  const normal=new THREE.Vector3(...normals[i]);
  // Eliminate any unintended component along the strap's travel direction.
  normal.addScaledVector(tangent,-normal.dot(tangent));
  if(normal.lengthSq()<1e-8){
   normal.set(0,1,0).addScaledVector(tangent,-tangent.y);
   if(normal.lengthSq()<1e-8)
    normal.set(0,0,1).addScaledVector(tangent,-tangent.z);
  }
  normal.normalize();
  const across=new THREE.Vector3().crossVectors(normal,tangent).normalize();
  if(previousWidth&&across.dot(previousWidth)<0)across.negate();
  previousWidth=across.clone();
  const halfW=width*.5,halfT=thickness*.5;
  const point=(sideW:number,sideT:number):XYZ=>{
   const p=center.clone().addScaledVector(across,sideW*halfW)
    .addScaledVector(normal,sideT*halfT);
   return [p.x,p.y,p.z];
  };
  rings.push([point(1,1),point(-1,1),point(1,-1),point(-1,-1)]);
 }
 return rawStrip(rings,m,group,'fitted-flat-surface-band');
}
/** Six-vertex authored armor body with clipped shoulders, not several
 * coincident nested boxes. The frontal cap is at the supplied outer face.
 * Coordinates are deliberately kept in chest-local +X forward.
 */
export function fittedArmorBag(group:THREE.Group,m:THREE.Material,
 outerFace:number,sign:number,top:number,bottom:number,
 width:number,upperInset:number,depth:number,split=false,vDepth=0){
 const yBreak=Math.max(bottom+1.6,top-2.25);
 const halves=split?[-1,1]:[0];
 for(const half of halves){
  const w=width*.5,u=Math.max(1.1,w-upperInset);
  // A genuine V neck is CUT from the upper fabric, not drawn as thin
  // decoration on a solid rectangle. Police only; flak/legacy stay closed.
  const innerTop=vDepth>0?Math.min(w-1.35,2.12):.10;
  const innerY=top-vDepth;
  const points=half===0?
   [[-w,bottom],[w,bottom],[w,yBreak],[u,top],[-u,top],[-w,yBreak]]:
   half<0?
   [[-w,bottom],[-.13,bottom],[-.13,innerY],
    [-innerTop,top],[-u,top],[-w,yBreak]]:
   [[.13,bottom],[w,bottom],[w,yBreak],
    [u,top],[innerTop,top],[.13,innerY]];
  const shape=new THREE.Shape();
  shape.moveTo(points[0][0],points[0][1]);
  for(const [z,y] of points.slice(1))shape.lineTo(z,y);
  shape.closePath();
  const geo=pixelUV(new THREE.ExtrudeGeometry(shape,{
   depth,bevelEnabled:false,steps:1,curveSegments:1
  }));
  geo.rotateY(sign*Math.PI/2);
   bakeGearGeometryAO(geo,m);
   const mesh=new THREE.Mesh(geo,m);
  mesh.position.x=sign*(outerFace-depth);
  mesh.name='authored-shaped-plate-bag';
  mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);
 }
}
/** Protective horseshoe around the back of the neck, open at the front.
 * Two returns and the rear yoke are ONE extruded silhouette. */
export function fittedArmorCollar(group:THREE.Group,m:THREE.Material,
 backX:number,frontX:number,outerZ:number,
 innerZ:number,y:number,height:number){
 const shape=new THREE.Shape();
 const points:readonly XZ[]=[
  [backX,-outerZ],[frontX,-outerZ],[frontX,-innerZ],
  [backX+1.55,-innerZ],[backX+1.55,innerZ],
  [frontX,innerZ],[frontX,outerZ],[backX,outerZ]
 ];
 shape.moveTo(points[0][0],-points[0][1]);
 for(const [x,z] of points.slice(1))shape.lineTo(x,-z);
 shape.closePath();
 const geo=pixelUV(new THREE.ExtrudeGeometry(shape,{
  depth:height,bevelEnabled:false,steps:1,curveSegments:1
 }));
 geo.rotateX(-Math.PI/2);
  bakeGearGeometryAO(geo,m);
  const mesh=new THREE.Mesh(geo,m);
 mesh.position.y=y-height*.5;
 mesh.name='integrated-protective-collar';
 mesh.castShadow=true;mesh.receiveShadow=true;
 group.add(mesh);
}

/** One clipped-corner, weight-bearing side armor insert.
 * The inset face is a second broad polygon rather than surface noise;
 * it reads clearly at game zoom and remains seated on the cummerbund.
 */
export function fittedArmoredSidePlate(group:THREE.Group,m:THREE.Material,
 x:number,y:number,innerZ:number,side:number,
 width=4.4,height=4.35,depth=.72){
 const hw=width*.5,hh=height*.5,chamfer=Math.min(.48,hw*.2);
 const path:readonly [number,number][]=[
  [-hw+chamfer,-hh],[hw-chamfer,-hh],
  [hw,-hh+chamfer],[hw,hh-chamfer],
  [hw-chamfer,hh],[-hw+chamfer,hh],
  [-hw,hh-chamfer],[-hw,-hh+chamfer]
 ];
 const shape=new THREE.Shape();
 shape.moveTo(path[0][0],path[0][1]);
 for(const [px,py] of path.slice(1))shape.lineTo(px,py);
 shape.closePath();
 const geo=pixelUV(new THREE.ExtrudeGeometry(shape,{
  depth,steps:1,bevelEnabled:false,curveSegments:1
 }));
 bakeGearGeometryAO(geo,m);
 const mesh=new THREE.Mesh(geo,m);
 mesh.position.set(x,y,side*innerZ);
 mesh.scale.z=side;
 mesh.name='heavy-protective-side-plate';
 mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
 return mesh;
}
