/** H3 ACH/MICH physical edge binding, correctly placed suspension screws,
 * and PASGT-weight four-point retention. One static assembly per helmet;
 * no per-frame geometry or texture allocation. -Z is the face.
 */
import * as THREE from 'three';
import {ACH_MICH_SHELLS} from './operator-headwear-silhouettes.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
export type AchMichDetailLayers={
 bare:THREE.Group;hardware:THREE.Group;strap:THREE.Group;
};
type Point=readonly [number,number,number];
type Profile={
 side:number;front:number;rear:number;brow:number;nape:number;
 frontStud:Point;rearStud:Point;
 /** Silhouette transition points down the right side, front to rear.
  * These match visible shell faces; no unsupported suspended trim. */
 hem:readonly Point[];
};
const PROFILES:Readonly<Record<typeof ACH_MICH_SHELLS[number],Profile>>={
 ach:{
  side:5.075,front:-5.535,rear:5.60,brow:4.40,nape:2.68,
  frontStud:[5.075,5.18,-2.85],rearStud:[5.075,4.64,2.72],
  hem:[[5.075,4.40,-5.535],[5.075,4.40,-2.20],
   [5.075,2.68,-1.45],[5.075,2.68,5.60]]
 },
 'mich-2002':{
  side:5.03,front:-5.70,rear:5.75,brow:4.55,nape:3.365,
  frontStud:[5.11,5.66,-3.0],rearStud:[5.115,5.08,3.77],
  hem:[[5.03,4.55,-5.70],[5.11,4.715,-4.48],
   [5.11,4.715,-1.90],[5.03,6.05,-1.25],
   [5.03,6.05,1.65],[5.115,3.97,2.30],
   [5.115,3.97,4.66],[5.03,3.365,5.75]]
 },
 'mich-2001':{
  side:5.015,front:-5.71,rear:5.66,brow:4.55,nape:3.33,
  frontStud:[5.065,6.57,-3.13],rearStud:[5.015,5.02,4.30],
  hem:[[5.015,4.55,-5.71],[5.065,5.945,-4.60],
   [5.065,5.945,-1.96],[5.015,6.155,-1.45],
   [5.015,6.155,2.95],[5.015,3.33,3.80],
   [5.015,3.33,5.66]]
 }
};
export const ACH_MICH_BINDING_HEIGHT=.39;
export const ACH_MICH_CHIN_STRAP_HALF_WIDTH=.43;
export const achMichProfile=(shell:typeof ACH_MICH_SHELLS[number]):Profile=>
 PROFILES[shell];
const material=(hex:number)=>new THREE.MeshStandardMaterial({
 color:hex,roughness:.97,metalness:0,flatShading:true,
 side:THREE.DoubleSide
});
const hidden=(parent:THREE.Group,name:string):THREE.Group=>{
 const g=new THREE.Group();g.name=name;parent.add(g);return g;
};
/** A real 0.39-high shell-edge facing, not a line hovering under the brim.
 * Front / sides / rear share endpoints. Segment center-line follows the
 * actual bottom perimeter, including the real high-cut gaps. */
export function createAchMichBindingGeometry(shell:typeof ACH_MICH_SHELLS[number]){
 const p=PROFILES[shell],data:number[]=[];
 const triangle=(a:Point,b:Point,c:Point)=>{
  data.push(...a,...b,...c);
 };
 const strip=(a:Point,b:Point,axis:'x'|'z')=>{
  const ext=.075;
  const start:Point=axis==='x'?[a[0]+Math.sign(a[0])*ext,a[1],a[2]]:
   [a[0],a[1],a[2]+(a[2]<0?-ext:ext)];
  const end:Point=axis==='x'?[b[0]+Math.sign(b[0])*ext,b[1],b[2]]:
   [b[0],b[1],b[2]+(b[2]<0?-ext:ext)];
  const raise=(v:Point):Point=>[v[0],v[1]+ACH_MICH_BINDING_HEIGHT,v[2]];
  triangle(start,end,raise(end));triangle(start,raise(end),raise(start));
 };
 strip([-p.side,p.brow,p.front],[p.side,p.brow,p.front],'z');
 strip([p.side,p.nape,p.rear],[-p.side,p.nape,p.rear],'z');
 for(const sign of [-1,1] as const){
  const pts=p.hem.map(v=>[sign*v[0],v[1],v[2]] as Point);
  for(let i=1;i<pts.length;i++)strip(pts[i-1],pts[i],'x');
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(data,3));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.achMichBinding=true;
 g.userData.segmentCount=2+2*(p.hem.length-1);
 g.userData.minimumHeight=ACH_MICH_BINDING_HEIGHT;
 return g;
}
function appendStrap(data:number[],path:readonly Point[],normal:THREE.Vector3,
 halfWidth=ACH_MICH_CHIN_STRAP_HALF_WIDTH){
 const vec=(p:Point)=>new THREE.Vector3(...p);
 for(let i=1;i<path.length;i++){
  const a=vec(path[i-1]),b=vec(path[i]);
  const tangent=b.clone().sub(a).normalize();
  const across=new THREE.Vector3().crossVectors(normal,tangent)
   .normalize().multiplyScalar(halfWidth);
  const v=[
   a.clone().add(across),a.clone().sub(across),
   b.clone().sub(across),b.clone().add(across)
  ];
  for(const p of [v[0],v[1],v[2],v[0],v[2],v[3]])
   data.push(p.x,p.y,p.z);
 }
}
/** Four substantial straps resolve into a single wide chin-cup.
 * Reuses PASGT's world-space ribbon normal rather than paper-thin
 * camera-axis quads. Both fasteners have physical strap origins. */
export function createAchMichRetentionGeometry(
 shell:typeof ACH_MICH_SHELLS[number]):THREE.BufferGeometry{
 const profile=PROFILES[shell],data:number[]=[];
 for(const sign of [-1,1] as const){
  const front:Point=[sign*(profile.frontStud[0]+.02),
   profile.frontStud[1]-.10,profile.frontStud[2]];
  const back:Point=[sign*(profile.rearStud[0]+.02),
   profile.rearStud[1]-.10,profile.rearStud[2]];
  const join:Point=[sign*4.19,1.26,-3.88];
  const chin:Point=[sign*2.20,-.12,-4.33];
  const normal=new THREE.Vector3(sign*.68,0,-.74);
  appendStrap(data,[front,join],normal,.46);
  appendStrap(data,[back,[sign*4.45,2.95,.80],join],normal,.43);
  appendStrap(data,[join,chin],normal,.48);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(data,3));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.achMichFourPoint=true;
 g.userData.chinWidth=ACH_MICH_CHIN_STRAP_HALF_WIDTH*2;
 return g;
}
function chinCupGeometry():THREE.BufferGeometry{
 const data:number[]=[];
 const l:Point=[-2.08,-.36,-4.38],m:Point=[0,-.44,-4.48],
  r:Point=[2.08,-.36,-4.38];
 const ul:Point=[-2.08,.19,-4.38],um:Point=[0,.23,-4.48],
  ur:Point=[2.08,.19,-4.38];
 for(const v of [l,m,um,l,um,ul,m,r,ur,m,ur,um])data.push(...v);
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(data,3));
 g.computeVertexNormals();g.computeBoundingBox();
 return g;
}
export function createAchMichDetails(parent:THREE.Group,id:string):AchMichDetailLayers{
 if(!(ACH_MICH_SHELLS as readonly string[]).includes(id))
  throw Error('ACH/MICH details require an ACH/MICH shell');
 const shell=id as typeof ACH_MICH_SHELLS[number];
 const p=PROFILES[shell];
 const bare=hidden(parent,id+'-integrated-rubber-edge-binding'),
  hardware=hidden(parent,id+'-uncovered-retention-anchors'),
  strap=hidden(parent,id+'-broad-four-point-retention');
 const edge=new THREE.Mesh(createAchMichBindingGeometry(shell),material(0x333a35));
 edge.name='ach-mich-rubber-shell-edge';edge.castShadow=false;
 edge.receiveShadow=false;bare.add(edge);
 const metal=material(0x636d61);
 const studGeometry=new THREE.BoxGeometry(.24,.52,.52);
 for(const sign of [-1,1] as const)
  for(const bolt of [p.frontStud,p.rearStud]){
   const mesh=new THREE.Mesh(studGeometry,metal);
   mesh.name='ach-mich-retention-screw';
   mesh.position.set(sign*(bolt[0]+.13),bolt[1],bolt[2]);
   mesh.castShadow=false;mesh.receiveShadow=false;hardware.add(mesh);
  }
 const webbing=material(0x59654f),pad=material(0x747c67);
 const main=new THREE.Mesh(createAchMichRetentionGeometry(shell),webbing);
 main.name='ach-mich-pasgt-width-four-point';main.castShadow=false;
 main.receiveShadow=false;strap.add(main);
 const cup=new THREE.Mesh(chinCupGeometry(),pad);
 cup.name='ach-mich-broad-chin-cup';cup.castShadow=false;
 cup.receiveShadow=false;strap.add(cup);
 // Keep each static material batched at creation; no global material/shader changes.
 consolidateVisualGroup(hardware);
 consolidateVisualGroup(strap);
 hardware.userData.achMichRetentionScrews=4;
 strap.userData.achMichFourPoint=true;
 return {bare,hardware,strap};
}
export function updateAchMichDetails(layers:AchMichDetailLayers,
 covered:boolean,allowStrap:boolean):void{
 // Rubber binding is the protective shell's permanent edge. The fitted cloth
 // stops just above it and conceals the fasteners, not the binding.
 layers.bare.visible=true;
 layers.hardware.visible=!covered;
 layers.strap.visible=allowStrap;
}
