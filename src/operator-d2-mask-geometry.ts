/**
 * D2-R: authored, flat-shaded mask solids. World-space dimensions use the
 * canonical 8×8×8 skull (-Z front, +X right, +Y up).
 * Geometry is constructed once per model; no pose-frame allocation.
 */
import * as THREE from 'three';
export type MaskPoint=readonly [number,number];
export type MaskMaterials={
 rubber:THREE.Material;hardware:THREE.Material;
 filters:THREE.Material;lens:THREE.Material;
};
export type MaskPlate={
 outline:readonly MaskPoint[];holes?:readonly (readonly MaskPoint[])[];
 front:number;depth?:number;edgeReturn?:number;nose?:number;
};
const asShape=(pts:readonly MaskPoint[])=>{
 const s=new THREE.Shape();pts.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));
 s.closePath();return s;
};
export function attach(g:THREE.Group,name:string,geo:THREE.BufferGeometry,
 mat:THREE.Material,shadow=true):THREE.Mesh{
 const obj=new THREE.Mesh(geo,mat);obj.name=name;
 obj.castShadow=shadow;obj.receiveShadow=false;g.add(obj);return obj;
}
export function block(g:THREE.Group,mat:THREE.Material,name:string,
 x:number,y:number,z:number,w:number,h:number,d:number):THREE.Mesh{
 const o=attach(g,name,new THREE.BoxGeometry(w,h,d),mat);
 o.position.set(x,y,z);return o;
}
/** A fitted plate with actual polygonal cut-outs, not flat lenses over rubber. */
export function plate(g:THREE.Group,mat:THREE.Material,name:string,
 spec:MaskPlate):THREE.Mesh{
 const s=asShape(spec.outline);
 for(const aperture of spec.holes??[]){
  const hole=new THREE.Path();
  aperture.forEach(([x,y],i)=>i?hole.lineTo(x,y):hole.moveTo(x,y));
  hole.closePath();s.holes.push(hole);
 }
 const depth=spec.depth??.4;
 const geo=new THREE.ExtrudeGeometry(s,{
  depth,bevelEnabled:false,steps:1,curveSegments:1
 });
 const pos=geo.getAttribute('position') as THREE.BufferAttribute;
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),localZ=pos.getZ(i);
  const cheekReturn=(spec.edgeReturn??0)*Math.min(1,Math.abs(x)/4.25);
  const nasal=(spec.nose??0)*
   Math.max(0,1-Math.abs(x)/2.0)*Math.max(0,1-Math.abs(y-2.5)/2.4);
  pos.setZ(i,spec.front+localZ+cheekReturn-nasal);
 }
 geo.computeVertexNormals();return attach(g,name,geo,mat);
}
export function extrudedProfile(g:THREE.Group,mat:THREE.Material,name:string,
 points:readonly MaskPoint[],z:number,depth=.42,edgeReturn=0):THREE.Mesh{
 return plate(g,mat,name,{outline:points,front:z,depth,edgeReturn});
}
export function line3(g:THREE.Group,mat:THREE.Material,name:string,
 a:readonly [number,number,number],
 b:readonly [number,number,number],width=.34,depth=.33):THREE.Mesh{
 const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
 const delta=end.clone().sub(start);
 const o=attach(g,name,new THREE.BoxGeometry(delta.length(),width,depth),mat);
 o.position.copy(start.add(end).multiplyScalar(.5));
 o.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),delta.normalize());
 return o;
}
export function strap(g:THREE.Group,mat:THREE.Material,name:string,
 path:readonly (readonly [number,number,number])[],width=.4){
 for(let i=1;i<path.length;i++)
  line3(g,mat,name+'-section',path[i-1],path[i],width,Math.max(.28,width*.8));
}
/** A single continuous lens surface: shaped and gently wrapped in depth. */
export function lens(g:THREE.Group,mat:THREE.Material,name:string,
 points:readonly MaskPoint[],z:number,wrap=0):THREE.Mesh{
 const geo=new THREE.ShapeGeometry(asShape(points));
 const pos=geo.getAttribute('position') as THREE.BufferAttribute;
 for(let i=0;i<pos.count;i++)
  pos.setZ(i,z+wrap*Math.min(1,Math.abs(pos.getX(i))/4.3));
 geo.computeVertexNormals();return attach(g,name,geo,mat,false);
}
/** Frames actually follow the aperture rather than obscuring it. */
export function rim(g:THREE.Group,mat:THREE.Material,name:string,
 points:readonly MaskPoint[],z:number,t=.35,wrap=0){
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  const za=z+wrap*Math.min(1,Math.abs(a[0])/4.3);
  const zb=z+wrap*Math.min(1,Math.abs(b[0])/4.3);
  line3(g,mat,name+'-segment',[a[0],a[1],za],[b[0],b[1],zb],t,t);
 }
}
export function eyePolygon(cx:number,cy:number,rx:number,ry:number,
 sides=8,tilt=0):MaskPoint[]{
 return Array.from({length:sides},(_,i)=>{
  const angle=Math.PI*2*(i/sides)+Math.PI/8;
  const u=Math.cos(angle)*rx,v=Math.sin(angle)*ry;
  return [cx+u+tilt*v,cy+v] as const;
 });
}
export function pairedEyes(g:THREE.Group,m:MaskMaterials,
 name:string,holes:readonly [readonly MaskPoint[],readonly MaskPoint[]],
 z:number,t=.33,wrap=0){
 for(const p of holes){
  lens(g,m.lens,name+'-lens',p,z-.04,wrap);
  rim(g,m.hardware,name+'-rim',p,z-.10,t,wrap);
 }
}
/** Exterior anatomical cheek/temple return, authored in the Y/Z side plane.
 * Unlike a faceplate extension this occupies the skull side and visibly turns
 * toward the ear. Each sign has its own outward facing thickened panel.
 */
export function sideProfile(g:THREE.Group,mat:THREE.Material,name:string,
 sign:-1|1,outline:readonly MaskPoint[],sideX=4.13,thick=.46):THREE.Mesh{
 const section=asShape(outline.map(([z,y])=>[-z,y] as const));
 const geometry=new THREE.ExtrudeGeometry(section,{
  depth:thick,bevelEnabled:false,steps:1,curveSegments:1
 });
 geometry.rotateY(Math.PI/2);
 geometry.computeVertexNormals();
 const result=attach(g,name,geometry,mat);
 result.position.x=sign>0?sideX:-sideX-thick;
 return result;
}
/** Short eight-facet axial cartridge with broad end cap; optional outward cant. */
export function canister(g:THREE.Group,m:THREE.Material,name:string,
 x:number,y:number,z:number,r:number,length:number,
 side=0,tiltY=0):THREE.Mesh{
 const mesh=attach(g,name,new THREE.CylinderGeometry(r*.92,r,length,8,1),m);
 mesh.position.set(x,y,z);
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),
  new THREE.Vector3(side,tiltY,-1).normalize());
 return mesh;
}
export function outlet(g:THREE.Group,m:MaskMaterials,name:string,
 x:number,y:number,z:number,r:number){
 canister(g,m.hardware,name+'-socket',x,y,z+.17,r*1.15,.45);
 canister(g,m.filters,name,x,y,z-.18,r,.53);
}
