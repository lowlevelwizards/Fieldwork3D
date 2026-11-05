/**
 * D2 EYE R1C: three deliberately distinct, OVERSIZED voxel goggle families.
 * Compact goggle (low), deeply boxed dust housing (field), and two bold
 * octagonal eye cups (retro). Every existing placement remains preallocated.
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
 const dx=b[0]-a[0],dy=b[1]-a[1];
 const mesh=box(g,m,name,(a[0]+b[0])/2,(a[1]+b[1])/2,
  z,Math.hypot(dx,dy)+.12,thick,.49);
 mesh.rotation.z=Math.atan2(dy,dx);return mesh;
}
function pane(g:THREE.Group,frame:THREE.Material,lens:THREE.Material,
 name:string,pts:readonly XY[],z:number,thickness:number){
 const outline=new THREE.Shape();
 pts.forEach(([x,y],i)=>i?outline.lineTo(x,y):outline.moveTo(x,y));
 outline.closePath();
 const mesh=new THREE.Mesh(new THREE.ShapeGeometry(outline),lens);
 mesh.name=name+'-lens';mesh.position.z=z+.27;
 mesh.castShadow=false;mesh.receiveShadow=false;mesh.renderOrder=2;g.add(mesh);
 for(let i=0;i<pts.length;i++)
  edge(g,frame,name+'-rim',pts[i],pts[(i+1)%pts.length],z,thickness);
}
function low(g:THREE.Group,frame:THREE.Material,lens:THREE.Material,seal:THREE.Material){
 // Compact tactical goggle: one wide, low shield with broad top/bottom bar.
 const outline:readonly XY[]=[
  [-4.00,4.56],[4.00,4.56],[3.94,3.04],
  [2.42,2.86],[.61,3.09],[-.61,3.09],[-2.42,2.86],[-3.94,3.04]
 ];
 pane(g,frame,lens,'compact-tactical-lens',outline,-4.79,.50);
 box(g,seal,'compact-brow-seal',0,4.60,-4.35,8.01,.55,.83);
 for(const side of [-1,1]){
  box(g,seal,'compact-side-seal',side*4.03,3.69,-4.33,
   .55,1.81,.85);
  box(g,frame,'compact-strap-anchor',side*4.25,3.67,-4.15,
   .60,.83,.74);
 }
}
function field(g:THREE.Group,frame:THREE.Material,lens:THREE.Material,seal:THREE.Material){
 // Field goggles are a projected, deep rectangular housing, not just
 // slightly thicker low-profile sport lenses.
 const outline:readonly XY[]=[
  [-4.08,4.80],[4.08,4.80],[4.08,2.53],
  [2.68,2.31],[.65,2.55],[-.65,2.55],[-2.68,2.31],[-4.08,2.53]
 ];
 pane(g,frame,lens,'heavy-field-lens',outline,-5.35,.76);
 box(g,seal,'deep-seal-top',0,4.88,-4.59,8.47,.82,1.47);
 box(g,seal,'deep-seal-bottom',0,2.40,-4.58,8.18,.68,1.36);
 for(const side of [-1,1]){
  box(g,seal,'deep-side-seal',side*4.14,3.65,-4.53,.80,2.73,1.54);
  box(g,frame,'large-strap-hook',side*4.42,3.63,-4.31,.83,1.02,1.03);
 }
}
function retro(g:THREE.Group,frame:THREE.Material,lens:THREE.Material,seal:THREE.Material){
 // Two very large 8-sided mechanical cups: chunky graphic octagons
 // instead of little precise rings. Keep intentionally separate lens eyes.
 for(const side of [-1,1]){
  const cx=side*2.12,cy=3.64,rx=1.70,ry=1.31;
  const pts:XY[]=[];
  for(let i=0;i<8;i++){
   const a=Math.PI*2*i/8;
   pts.push([cx+rx*Math.cos(a),cy+ry*Math.sin(a)]);
  }
  pane(g,frame,lens,'octagonal-eye-cup',pts,-5.15,.67);
  box(g,seal,'deep-round-cup',cx,cy,-4.43,3.02,1.53,1.16);
  box(g,frame,'wide-outer-cup-lock',side*3.79,cy,-4.74,
   .73,1.67,1.08);
 }
 edge(g,frame,'bold-cup-bridge',[-.64,3.83],[.64,3.83],-5.18,.65);
 box(g,seal,'wide-nose-support',0,3.58,-4.46,1.25,.54,.62);
}
function strap(g:THREE.Group,elastic:THREE.Material,frame:THREE.Material,id:D2GoggleId){
 const thick=id==='goggles-field'?.79:id==='goggles-low'?.59:.67;
 const half=id==='goggles-field'?4.53:4.27;
 const frontZ=id==='goggles-field'?-4.82:-4.48;
 for(const side of [-1,1]){
  box(g,elastic,'wide-strap-side',side*half,3.64,-.02,
   .58,thick,8.92);
  box(g,frame,'substantial-buckle',side*half,3.64,-2.91,
   .73,thick+.24,.87);
  box(g,elastic,'strap-front-landing',side*half,3.64,frontZ,
   .62,thick,.75);
 }
 box(g,elastic,'strap-back',0,3.64,4.32,half*2+.48,thick,.57);
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
   case 'forehead':model.position.set(0,2.43,-.13);break;
   case 'helmet':
    model.position.set(0,3.83,-.52);model.scale.set(1.14,1,1.14);break;
   case 'neck':
    model.position.set(0,-5.42,1.08);model.scale.set(.93,.92,.91);break;
  }
  model.visible=position==='eyes';
  root.add(model);
 }
 return root;
}
