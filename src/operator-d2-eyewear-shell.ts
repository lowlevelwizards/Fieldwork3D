/** D2 Eyewear R3: authored, low-piece-count three-dimensional primitives.
 * Canonical head: 8 x 8 x 8; -Z is forward, +Y is up. All parts are
 * allocated once, share rig-owned materials, and never affect hitboxes.
 */
import * as THREE from 'three';
export type EyePoint=readonly [number,number];
export type EyePolygon=readonly EyePoint[];
export type EyeFamily='open-frame'|'pilot'|'wedge'|'shield'|'compact-seal'|'field-seal'|'cups';
export type EyeTopology='twin'|'single-shield'|'single-sealed'|'twin-cups';
export type EyeProfile={
 family:EyeFamily;topology:EyeTopology;width:number;height:number;
 frontZ:number;housingDepth:number;lenses:number;version:3;
};
const extent=(pts:EyePolygon)=>({
 minX:Math.min(...pts.map(p=>p[0])),maxX:Math.max(...pts.map(p=>p[0])),
 minY:Math.min(...pts.map(p=>p[1])),maxY:Math.max(...pts.map(p=>p[1]))
});
function path(pts:EyePolygon):THREE.Shape{
 const shape=new THREE.Shape();
 pts.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));
 shape.closePath();return shape;
}
function describe(
 mesh:THREE.Mesh,outer:EyePolygon,
 family:EyeFamily,topology:EyeTopology,z:number,depth:number,lenses:number
):THREE.Mesh{
 const e=extent(outer);
 mesh.userData.d2EyeProfile={
  family,topology,width:e.maxX-e.minX,height:e.maxY-e.minY,
  frontZ:z,housingDepth:depth,lenses,version:3
 } satisfies EyeProfile;
 return mesh;
}
function add(parent:THREE.Group,mesh:THREE.Mesh,name:string):THREE.Mesh{
 mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
 parent.add(mesh);return mesh;
}
/** One piece of graphic acetate/metal with real empty openings.
 * Only for actual open spectacles (not shield lenses or protective gaskets).
 */
export function frameRing(parent:THREE.Group,material:THREE.Material,
 name:string,outer:EyePolygon,holes:readonly EyePolygon[],
 frontZ:number,depth:number,family:EyeFamily):THREE.Mesh{
 const shape=path(outer);
 for(const points of holes){
  const hole=new THREE.Path();
  points.forEach(([x,y],i)=>i?hole.lineTo(x,y):hole.moveTo(x,y));
  hole.closePath();shape.holes.push(hole);
 }
 const geo=new THREE.ExtrudeGeometry(shape,{
  depth,steps:1,bevelEnabled:false,curveSegments:1
 });
 const mesh=add(parent,new THREE.Mesh(geo,material),name+'-housing');
 mesh.position.z=frontZ;
 return describe(mesh,outer,family,'twin',frontZ,depth,holes.length);
}
/** A frontal ring whose ENTIRE body follows one broad curve toward the
 * temples. The underlying continuous shell replaces a separately bolted fin.
 */
export function sweptFrame(parent:THREE.Group,material:THREE.Material,
 name:string,outer:EyePolygon,holes:readonly EyePolygon[],
 frontZ:number,depth:number,sweep:number):THREE.Mesh{
 const shell=frameRing(parent,material,name,outer,holes,
  frontZ,depth,'wedge');
 const pos=shell.geometry.attributes.position as THREE.BufferAttribute;
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i);
  pos.setZ(i,pos.getZ(i)+sweep*Math.pow(Math.abs(x)/4,2));
 }
 pos.needsUpdate=true;
 shell.geometry.computeVertexNormals();
 return shell;
}
/** Single clean dyed pane. No generic glass highlights or microreflection
 * strips; transparent material is the only lens surface.
 */
export function lensSurface(parent:THREE.Group,material:THREE.Material,
 name:string,outline:EyePolygon,z:number,sweep=0):THREE.Mesh{
 const geo=new THREE.ShapeGeometry(path(outline),1);
 const positions=geo.attributes.position as THREE.BufferAttribute;
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i);
  positions.setZ(i,z+sweep*Math.pow(Math.abs(x)/4,2));
 }
 positions.needsUpdate=true;
 geo.computeVertexNormals();
 const mesh=add(parent,new THREE.Mesh(geo,material),name+'-lens');
 mesh.castShadow=false;mesh.receiveShadow=false;mesh.renderOrder=2;
 return mesh;
}
/** A ring with DIFFERENT front and rear silhouettes, making depth and
 * taper meaningful rather than simply extruding a front drawing.
 * Four corresponding polygon loops have identical vertex counts.
 * One mesh contains front rim, outer shell, back rim, and inner seal wall.
 */
export function sculptedHousing(parent:THREE.Group,material:THREE.Material,
 name:string,frontOuter:EyePolygon,frontInner:EyePolygon,
 rearOuter:EyePolygon,rearInner:EyePolygon,
 frontZ:number,rearZ:number,family:EyeFamily,topology:EyeTopology):THREE.Mesh{
 const n=frontOuter.length;
 if(n<4||[frontInner,rearOuter,rearInner].some(p=>p.length!==n))
  throw new Error(name+': housing loops require equal 4+ vertex counts');
 if(!(rearZ>frontZ))throw new Error(name+': rear must be behind front');
 // Normalize all corresponding profile loops to counterclockwise XY
 // so the frontal cap faces the camera (-Z) on boxes and round eyecups.
 const area=(p:EyePolygon)=>p.reduce((s,[x,y],i)=>{
  const [nx,ny]=p[(i+1)%p.length];return s+x*ny-nx*y;
 },0);
 if(area(frontOuter)<0){
  frontOuter=[...frontOuter].reverse();
  frontInner=[...frontInner].reverse();
  rearOuter=[...rearOuter].reverse();
  rearInner=[...rearInner].reverse();
 }
 const positions:number[]=[];
 const face=(a:readonly number[],b:readonly number[],c:readonly number[])=>{
  positions.push(...a,...b,...c);
 };
 const v=(poly:EyePolygon,i:number,z:number):number[]=>[
  poly[(i+n)%n][0],poly[(i+n)%n][1],z
 ];
 for(let i=0;i<n;i++){
  const j=(i+1)%n;
  const a=v(frontOuter,i,frontZ),b=v(frontOuter,j,frontZ);
  const c=v(frontInner,i,frontZ),d=v(frontInner,j,frontZ);
  const e=v(rearOuter,i,rearZ),f=v(rearOuter,j,rearZ);
  const g=v(rearInner,i,rearZ),h=v(rearInner,j,rearZ);
  // Front/back ring, outside wall, and inside wall. Non-indexed gives
  // intentionally flat facet normals, no smoothing or microbevels.
  face(a,c,d);face(a,d,b);
  face(e,f,h);face(e,h,g);
  face(a,b,f);face(a,f,e);
  face(c,g,h);face(c,h,d);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.computeVertexNormals();
 const mesh=add(parent,new THREE.Mesh(geo,material),name+'-housing');
 return describe(mesh,frontOuter,family,topology,frontZ,rearZ-frontZ,
  topology==='twin-cups'?2:1);
}
/** A single tapering solid arm, not a fin bolted onto a frontal plate.
 * Full 3D stations make an intentional silhouette in side view.
 */
export function templeArm(parent:THREE.Group,material:THREE.Material,
 name:string,side:-1|1,front:{x:number;y:number;z:number;w:number;h:number},
 rear:{x:number;y:number;z:number;w:number;h:number}):THREE.Mesh{
 const station=(s:typeof front):number[][]=>[
  [side*s.x-s.w/2,s.y-s.h/2,s.z],
  [side*s.x+s.w/2,s.y-s.h/2,s.z],
  [side*s.x+s.w/2,s.y+s.h/2,s.z],
  [side*s.x-s.w/2,s.y+s.h/2,s.z]
 ];
 const vertices=[...station(front),...station(rear)];
 const tris:number[][]=[
  [0,2,1],[0,3,2],[4,5,6],[4,6,7],
  [0,1,5],[0,5,4],[1,2,6],[1,6,5],
  [2,3,7],[2,7,6],[3,0,4],[3,4,7]
 ];
 const positions=tris.flatMap(t=>t.flatMap(i=>vertices[i]));
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.computeVertexNormals();
 return add(parent,new THREE.Mesh(geo,material),name+(side===-1?'-left':'-right'));
}
/** Single rectangular block, reserved for bold bridges and gasket anchors. */
export function block(parent:THREE.Group,material:THREE.Material,
 name:string,x:number,y:number,z:number,w:number,h:number,d:number):THREE.Mesh{
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
 mesh.position.set(x,y,z);
 return add(parent,mesh,name);
}
export function octagon(cx:number,cy:number,rx:number,ry:number):EyePoint[]{
 const points:EyePoint[]=[];
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4+Math.PI/8;
  points.push([cx+rx*Math.cos(a),cy+ry*Math.sin(a)]);
 }
 return points;
}
export function shifted(points:EyePolygon,dx:number,dy=0):EyePoint[]{
 return points.map(([x,y])=>[x+dx,y+dy]);
}
/** Three deliberate large masses wrap behind an actual head. */
export function strapBand(parent:THREE.Group,mat:THREE.Material,
 halfWidth:number,y:number,thickness:number):void{
 for(const side of [-1,1])
  block(parent,mat,'strap-side',side*halfWidth,y,-.05,
   thickness,thickness+.20,8.55);
 block(parent,mat,'strap-back',0,y,4.22,
  halfWidth*2+.25,thickness+.20,.55);
}

/** R4 explicit fit anchors. Front x is near a frame's outside corner, while
 * the shoulder and rear stations are intentionally OUTSIDE the cube head
 * (|x| >= 4). The forward-facing overlap hides the mechanical join instead
 * of a tiny decorative hinge cube. One watertight 3-station mesh per side.
 */
export type EyewearTempleFit={
 frontX:number;frontY:number;frontZ:number;
 shoulderX:number;shoulderY:number;shoulderZ:number;
 rearX:number;rearY:number;rearZ:number;
 frontHeight:number;shoulderHeight:number;rearHeight:number;
 frontWidth?:number;shoulderWidth?:number;rearWidth?:number;
};
export function fittedTempleArm(parent:THREE.Group,material:THREE.Material,
 name:string,side:-1|1,fit:EyewearTempleFit):THREE.Mesh{
 const stations=[
  [fit.frontX,fit.frontY,fit.frontZ,fit.frontWidth??.58,fit.frontHeight],
  [fit.shoulderX,fit.shoulderY,fit.shoulderZ,fit.shoulderWidth??.63,fit.shoulderHeight],
  [fit.rearX,fit.rearY,fit.rearZ,fit.rearWidth??.40,fit.rearHeight]
 ] as const;
 if(fit.shoulderX-(fit.shoulderWidth??.63)/2<4.005 ||
    fit.rearX-(fit.rearWidth??.40)/2<4.005)
  throw new Error(name+': temples must clear the 8-unit head side');
 if(!(fit.frontZ<fit.shoulderZ&&fit.shoulderZ<fit.rearZ))
  throw new Error(name+': front, shoulder and rear should follow the face');
 const v:number[][]=[];
 for(const [x,y,z,w,h] of stations){
  const cx=side*x;
  v.push([cx-w/2,y-h/2,z],[cx+w/2,y-h/2,z],
    [cx+w/2,y+h/2,z],[cx-w/2,y+h/2,z]);
 }
 const triangles:number[][]=[
  [0,2,1],[0,3,2],[8,9,10],[8,10,11]
 ];
 for(let j=0;j<2;j++){
  const a=4*j,b=4*(j+1);
  for(let k=0;k<4;k++){
   const next=(k+1)%4;
   triangles.push([a+k,a+next,b+next],[a+k,b+next,b+k]);
  }
 }
 const positions=triangles.flatMap(t=>t.flatMap(i=>v[i]));
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.computeVertexNormals();
 const mesh=add(parent,new THREE.Mesh(geo,material),
  name+(side===-1?'-left':'-right'));
 mesh.userData.d2TempleFit={...fit,side,version:4};
 return mesh;
}
