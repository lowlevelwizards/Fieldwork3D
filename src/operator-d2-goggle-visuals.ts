/**
 * D2-B2: three unmistakable goggle silhouettes in canonical -Z-forward
 * head space. Each has four pre-built physical placements (eye, forehead,
 * helmet and neck); runtime merely toggles visibility. No per-pose geometry.
 */
import * as THREE from 'three';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';
export type D2GoggleId='goggles-low'|'goggles-field'|'goggles-retro';
export type D2GogglePlacement='eyes'|'forehead'|'helmet'|'neck';
type XY=readonly [number,number];
const box=(g:THREE.Group,m:THREE.Material,name:string,
 x:number,y:number,z:number,w:number,h:number,d:number)=>{
 const mesh=new THREE.Mesh(mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d),m);
 mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;
 mesh.receiveShadow=true;g.add(mesh);return mesh;
};
function edge(g:THREE.Group,m:THREE.Material,name:string,
 a:XY,b:XY,z:number,thick:number){
 const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
 const mesh=box(g,m,name,(a[0]+b[0])/2,(a[1]+b[1])/2,
  z,len,thick,.28);
 mesh.rotation.z=Math.atan2(dy,dx);
 return mesh;
}
function lensPolygon(g:THREE.Group,frame:THREE.Material,lens:THREE.Material,
 name:string,points:readonly XY[],z:number,thick:number){
 const shape=new THREE.Shape();
 for(const [i,[x,y]] of points.entries()){
  if(!i)shape.moveTo(x,y);else shape.lineTo(x,y);
 }
 shape.closePath();
 const pane=new THREE.Mesh(new THREE.ShapeGeometry(shape),lens);
 pane.name=name+'-lens';pane.position.z=z+.20;
 pane.castShadow=false;pane.receiveShadow=false;
 pane.renderOrder=2;g.add(pane);
 for(let i=0;i<points.length;i++)
  edge(g,frame,name+'-rim',points[i],points[(i+1)%points.length],z,thick);
}
function low(g:THREE.Group,frame:THREE.Material,lens:THREE.Material,seal:THREE.Material){
 const shape:readonly XY[]=[
  [-3.83,4.31],[-1.55,4.38],[1.55,4.38],[3.83,4.31],
  [3.63,3.03],[1.32,2.95],[.35,3.15],[-.35,3.15],[-1.32,2.95],[-3.63,3.03]
 ];
 lensPolygon(g,frame,lens,'low-profile-shield',shape,-4.68,.19);
 box(g,seal,'shallow-eye-seal-top',0,4.45,-4.28,7.55,.31,.42);
 for(const side of [-1,1])
  box(g,seal,'shallow-eye-seal-side',side*3.78,3.66,-4.28,
   .36,1.50,.45);
}
function field(g:THREE.Group,frame:THREE.Material,lens:THREE.Material,seal:THREE.Material){
 const shape:readonly XY[]=[
  [-4.0,4.50],[-2.10,4.56],[2.10,4.56],[4.0,4.50],
  [3.86,2.80],[1.25,2.70],[.45,2.97],[-.45,2.97],[-1.25,2.70],[-3.86,2.80]
 ];
 lensPolygon(g,frame,lens,'deep-dust-shield',shape,-5.10,.43);
 // Deep field-goggle gasket projects substantially past the forehead.
 box(g,seal,'thick-seal-top',0,4.58,-4.49,8.1,.55,1.0);
 box(g,seal,'thick-seal-bottom-left',-2.33,2.65,-4.42,3.24,.63,1.12);
 box(g,seal,'thick-seal-bottom-right',2.33,2.65,-4.42,3.24,.63,1.12);
 for(const side of [-1,1]){
  box(g,seal,'deep-side-seal',side*4.02,3.65,-4.45,.69,2.07,1.10);
  box(g,frame,'large-strap-hook',side*4.30,3.60,-4.42,.52,.70,.75);
 }
}
function retro(g:THREE.Group,frame:THREE.Material,lens:THREE.Material,seal:THREE.Material){
 for(const side of [-1,1]){
  const cx=side*2.15,cy=3.58,rx=1.48,ry=1.10;
  const pts:XY[]=[];
  // Deliberate octagonal rims, not high-poly round cylinders.
  for(let i=0;i<8;i++){
   const theta=(Math.PI*2*i)/8;
   pts.push([cx+rx*Math.cos(theta),cy+ry*Math.sin(theta)]);
  }
  lensPolygon(g,frame,lens,'round-eye-cup',pts,-4.95,.40);
  box(g,seal,'rear-cup-seal',cx,cy,-4.27,2.40,.95,.62);
  box(g,frame,'round-cup-housing',side*3.55,cy,-4.50,.50,1.30,.85);
 }
 edge(g,frame,'short-cup-bridge',[-.72,3.70],[.72,3.70],-5.00,.40);
 box(g,seal,'bridge-pad',0,3.65,-4.42,1.12,.34,.42);
}
function strap(g:THREE.Group,m:THREE.Material,frame:THREE.Material,id:D2GoggleId){
 const thickness=id==='goggles-field'?.57:id==='goggles-low'?.33:.36;
 const half=id==='goggles-field'?4.48:4.24;
 const frontZ=id==='goggles-field'?-4.72:-4.43;
 for(const side of [-1,1]){
  box(g,m,'strap-side',side*half,3.63,-.02,
   .43,thickness,8.83);
  box(g,frame,'strap-buckle',side*half,3.63,-2.87,
   .58,thickness+.22,.72);
  box(g,m,'strap-front-landing',side*half,3.63,frontZ,
   .43,thickness,.48);
 }
 box(g,m,'strap-back',0,3.63,4.30,
  half*2+.4,thickness,.47);
}
function makeOne(id:D2GoggleId,frame:THREE.Material,
 lens:THREE.Material,elastic:THREE.Material){
 const g=new THREE.Group();
 if(id==='goggles-low')low(g,frame,lens,elastic);
 else if(id==='goggles-field')field(g,frame,lens,elastic);
 else retro(g,frame,lens,elastic);
 strap(g,elastic,frame,id);
 return g;
}
export function createD2Goggles(
 id:D2GoggleId,frame:THREE.Material,
 lens:THREE.Material,elastic:THREE.Material
):THREE.Group{
 const root=new THREE.Group();root.name='d2-'+id;
 root.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 for(const position of ['eyes','forehead','helmet','neck'] as const){
  const model=makeOne(id,frame,lens,elastic);
  model.name=id+'-'+position;
  model.userData.d2GogglePlacement=position;
  switch(position){
   case 'forehead':
    model.position.set(0,2.43,-.13);break;
   case 'helmet':
    model.position.set(0,3.83,-.52);
    model.scale.set(1.14,1,1.14);break;
   case 'neck':
    model.position.set(0,-5.42,1.08);
    model.scale.set(.93,.92,.91);break;
  }
  model.visible=position==='eyes';
  root.add(model);
 }
 return root;
}
