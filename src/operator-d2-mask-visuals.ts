/**
 * D2-C: six visually independent protective face-mask archetypes.
 * Cosmetics ONLY. No certified protection, gas filtering, changed vision
 * cones, collision volumes, weapon grips or simulation stats.
 * Canonical head axes: -Z toward face, +X wearer's right, +Y up.
 */
import * as THREE from 'three';
import {mapBoxPixelUV} from './rendering/pixel-materials.ts';
export type D2MaskId='half-mask'|'respirator-half'|'gas-gp5'|'gas-m17'|'gas-m40'|'gas-m50';
export type D2MaskMaterials={
 rubber:THREE.Material;hardware:THREE.Material;
 filters:THREE.Material;lens:THREE.Material;
};
type XY=readonly [number,number];
function box(g:THREE.Group,m:THREE.Material,name:string,
 x:number,y:number,z:number,w:number,h:number,d:number){
 const mesh=new THREE.Mesh(mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d),m);
 mesh.name=name;mesh.position.set(x,y,z);
 mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
}
function tube(g:THREE.Group,m:THREE.Material,name:string,
 x:number,y:number,z:number,r:number,length:number,segments=8){
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,length,segments),m);
 mesh.name=name;mesh.position.set(x,y,z);mesh.rotation.x=Math.PI/2;
 mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
}
function edge(g:THREE.Group,m:THREE.Material,name:string,a:XY,b:XY,z:number,t=.28){
 const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
 const mesh=box(g,m,name,(a[0]+b[0])/2,(a[1]+b[1])/2,z,len,t,.35);
 mesh.rotation.z=Math.atan2(dy,dx);return mesh;
}
function window(g:THREE.Group,m:D2MaskMaterials,name:string,
 points:readonly XY[],z:number,t=.31){
 const shape=new THREE.Shape();
 for(let i=0;i<points.length;i++){
  const [x,y]=points[i];if(!i)shape.moveTo(x,y);else shape.lineTo(x,y);
 }
 shape.closePath();
 const pane=new THREE.Mesh(new THREE.ShapeGeometry(shape),m.lens);
 pane.name=name+'-lens';pane.position.z=z+.18;
 pane.castShadow=false;pane.receiveShadow=false;pane.renderOrder=2;g.add(pane);
 for(let i=0;i<points.length;i++)
  edge(g,m.hardware,name+'-rim',points[i],points[(i+1)%points.length],z,t);
}
function roundEye(g:THREE.Group,m:D2MaskMaterials,name:string,
 cx:number,cy:number,z:number,rx=1.20,ry=1.16){
 const pts:XY[]=[];
 for(let i=0;i<8;i++){
  const a=2*Math.PI*i/8;
  pts.push([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry]);
 }
 window(g,m,name,pts,z,.33);
}
function headHarness(g:THREE.Group,m:D2MaskMaterials,height=3.10){
 for(const side of [-1,1]){
  box(g,m.hardware,'head-harness-side',side*4.23,height,0,.43,.58,8.57);
  box(g,m.filters,'harness-buckle',side*4.29,height,-3.22,.68,.83,.73);
 }
 box(g,m.hardware,'head-harness-back',0,height,4.24,8.7,.62,.47);
 box(g,m.hardware,'harness-top',0,6.44,1.0,7.9,.36,6.8);
}
function halfShield(g:THREE.Group,m:D2MaskMaterials,meshFront:boolean){
 box(g,m.rubber,'rigid-half-mask-face',0,1.34,-4.73,7.25,2.83,1.28);
 box(g,m.rubber,'half-nasal-ridge',0,2.83,-5.02,2.65,.78,.68);
 box(g,m.rubber,'half-chin',0,-.28,-4.80,5.86,.56,.98);
 for(const side of [-1,1]){
  box(g,m.rubber,'half-shell-cheek',side*3.57,1.48,-4.66,.63,2.42,1.46);
 }
 if(meshFront){
  box(g,m.hardware,'wide-mesh-grille',0,1.42,-5.48,5.68,1.28,.20);
  for(const side of [-1,1])
   box(g,m.filters,'mesh-side-vent',side*2.47,1.50,-5.61,.63,1.02,.23);
 }else{
  box(g,m.filters,'hard-nose-panel',0,1.63,-5.48,4.10,1.18,.20);
  box(g,m.hardware,'low-air-intake',0,.78,-5.59,3.65,.40,.24);
 }
 for(const side of [-1,1]){
  box(g,m.hardware,'half-strap-side',side*4.15,2.05,-.09,.46,.42,8.64);
  box(g,m.hardware,'half-strap-buckle',side*4.18,2.06,-3.68,.75,.75,.64);
 }
 box(g,m.hardware,'half-strap-back',0,2.05,4.25,8.55,.46,.39);
}
function respirator(g:THREE.Group,m:D2MaskMaterials,compact:boolean){
 box(g,m.rubber,'respirator-triangular-seal',0,1.24,-4.78,5.86,3.23,1.28);
 box(g,m.rubber,'respirator-nose-peak',0,3.02,-5.25,2.33,.82,1.01);
 box(g,m.filters,'respirator-valve',0,.53,-5.59,2.03,1.12,.45);
 if(compact){
  tube(g,m.filters,'compact-front-filter',0,1.31,-6.56,1.28,1.60,8);
  box(g,m.hardware,'compact-filter-seat',0,1.30,-5.89,1.95,1.85,.45);
 }else{
  for(const side of [-1,1]){
   box(g,m.hardware,'dual-filter-port',side*2.75,1.13,-5.55,1.16,1.42,.92);
   tube(g,m.filters,'dual-filter-canister',side*3.13,1.12,-6.30,1.05,1.46,8);
  }
 }
 headHarness(g,m,1.97);
}
function gp5(g:THREE.Group,m:D2MaskMaterials){
 // GP-5-style rubber HOOD instead of a strapped facepiece.
 box(g,m.rubber,'hood-crown',0,7.27,0,8.52,.55,8.52);
 box(g,m.rubber,'hood-back',0,3.10,4.23,8.5,8.35,.49);
 for(const side of [-1,1])
  box(g,m.rubber,'hood-temple',side*4.23,3.1,0,.49,8.35,8.50);
 box(g,m.rubber,'hood-brow',0,5.78,-4.20,8.5,2.73,.48);
 box(g,m.rubber,'hood-lower-face',0,1.05,-4.20,8.5,3.03,.49);
 box(g,m.rubber,'hood-neck-collar',0,-1.28,.40,8.35,1.76,7.78);
 for(const side of [-1,1])roundEye(g,m,'gp5-round-eye',side*2.0,3.70,-4.83,1.15,1.13);
 box(g,m.hardware,'gp5-front-port',0,1.14,-5.01,3.18,2.08,.68);
 tube(g,m.filters,'gp5-central-canister',0,.72,-6.49,1.36,2.33,8);
 box(g,m.hardware,'gp5-filter-base',0,.78,-5.65,2.30,1.85,.61);
}
function m17(g:THREE.Group,m:D2MaskMaterials){
 box(g,m.rubber,'m17-full-facepiece',0,2.56,-4.54,7.88,5.91,1.19);
 box(g,m.rubber,'m17-chin-seal',0,-.58,-4.36,6.65,.77,.82);
 for(const side of [-1,1]){
  roundEye(g,m,'m17-round-eyepiece',side*2.0,4.01,-5.30,1.18,1.10);
  box(g,m.filters,'m17-integrated-cheek-filter',side*2.84,1.28,
   -5.40,2.68,2.75,.65);
  box(g,m.hardware,'m17-cheek-filter-frame',side*2.77,1.25,
   -5.75,2.28,1.79,.22);
 }
 box(g,m.hardware,'m17-center-exhale-speech',0,.99,-5.70,1.70,1.55,.39);
 headHarness(g,m);
}
function m40(g:THREE.Group,m:D2MaskMaterials){
 box(g,m.rubber,'m40-full-facepiece',0,2.46,-4.62,7.62,5.95,1.27);
 box(g,m.rubber,'m40-chin',0,-.67,-4.62,6.20,.67,1.06);
 // Enlarged angular spectacles distinguish the M40 from GP-5/M17 round eyes.
 for(const side of [-1,1]){
  const cx=side*2.07;
  const pane:XY[]=[
   [cx-1.39,4.78],[cx+1.39,4.78],[cx+1.52,3.93],
   [cx+1.17,2.93],[cx-1.17,2.93],[cx-1.52,3.93]
  ];
  window(g,m,'m40-angular-eyepiece',pane,-5.34,.29);
 }
 box(g,m.hardware,'m40-exhalation-front',0,.90,-5.42,2.23,1.73,.62);
 // Correct asymmetric external cheek cartridge, NOT integrated M17 pouches.
 box(g,m.hardware,'m40-single-side-port',3.11,1.55,-5.39,1.66,1.63,.69);
 tube(g,m.filters,'m40-projecting-side-canister',3.33,1.39,-6.84,1.42,2.05,8);
 headHarness(g,m);
}
function m50(g:THREE.Group,m:D2MaskMaterials){
 box(g,m.rubber,'m50-lower-face-seal',0,1.22,-4.73,7.9,3.08,1.03);
 box(g,m.rubber,'m50-brow',0,5.20,-4.60,8.15,.91,.76);
 for(const side of [-1,1])
  box(g,m.rubber,'m50-visor-side',side*4.10,3.56,-4.59,.58,3.6,.95);
 const pane:readonly XY[]=[
  [-3.84,4.88],[-1.7,4.95],[1.7,4.95],[3.84,4.88],
  [3.68,2.55],[1.30,2.51],[.48,2.82],[-.48,2.82],
  [-1.30,2.51],[-3.68,2.55]
 ];
 window(g,m,'m50-one-piece-panoramic-visor',pane,-5.24,.29);
 for(const side of [-1,1]){
  box(g,m.hardware,'m50-conformal-cheek-port',side*3.18,1.17,-5.18,1.47,2.10,.42);
  box(g,m.filters,'m50-twin-low-cheek-filter',side*3.17,1.12,-5.68,1.60,1.92,.55);
 }
 box(g,m.hardware,'m50-low-exhale-module',0,.57,-5.62,2.60,1.27,.67);
 headHarness(g,m);
}
export function createD2Mask(id:D2MaskId,m:D2MaskMaterials):THREE.Group{
 const root=new THREE.Group();root.name='d2-'+id;
 root.userData.modelAxes='-Z-forward,+X-right,+Y-up';
 if(id==='half-mask'||id==='respirator-half'){
  const variants=id==='half-mask'?['solid','mesh']:['twin-filter','compact-filter'];
  for(const mode of variants){
   const sub=new THREE.Group();sub.name=id+'-'+mode;
   sub.userData.d2MaskMode=mode;sub.visible=mode===variants[0];
   if(id==='half-mask')halfShield(sub,m,mode==='mesh');
   else respirator(sub,m,mode==='compact-filter');
   root.add(sub);
  }
 }else if(id==='gas-gp5')gp5(root,m);
 else if(id==='gas-m17')m17(root,m);
 else if(id==='gas-m40')m40(root,m);
 else m50(root,m);
 return root;
}
