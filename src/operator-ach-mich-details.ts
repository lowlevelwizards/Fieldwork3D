/** H3 ACH/MICH physical edge binding, correctly placed suspension screws,
 * and PASGT-weight four-point retention. One static assembly per helmet;
 * no per-frame geometry or texture allocation. -Z is the face.
 */
import * as THREE from 'three';
import {ACH_MICH_SHELLS} from './operator-headwear-silhouettes.ts';
import {consolidateVisualGroup} from './operator-visual-mesh-merge.ts';
export type AchMichDetailLayers={
 bare:THREE.Group;coveredLiner:THREE.Group;hardware:THREE.Group;strap:THREE.Group;
 webbingMaterial:THREE.MeshStandardMaterial;
 bindingMaterial:THREE.MeshBasicMaterial;
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
  frontStud:[5.075,4.95,-3.12],rearStud:[5.075,3.91,1.86],
  hem:[[5.075,4.40,-5.535],[5.075,4.40,-1.96],
   [5.075,3.36,-1.49],[5.075,3.36,2.72],
   [5.075,2.68,3.30],[5.075,2.68,5.60]]
 },
 'mich-2002':{
  side:5.03,front:-5.70,rear:5.75,brow:4.55,nape:3.365,
  frontStud:[5.11,5.265,-3.10],rearStud:[5.115,4.52,3.05],
  hem:[[5.03,4.55,-5.70],[5.11,4.715,-4.48],
   [5.11,4.715,-1.90],[5.03,6.05,-1.25],
   [5.03,6.05,1.65],[5.115,3.97,2.30],
   [5.115,3.97,4.66],[5.03,3.365,5.75]]
 },
 'mich-2001':{
  side:5.015,front:-5.71,rear:5.66,brow:4.55,nape:3.33,
  frontStud:[5.065,6.495,-3.16],rearStud:[5.015,3.91,3.79],
  hem:[[5.015,4.55,-5.71],[5.065,5.945,-4.60],
   [5.065,5.945,-1.96],[5.015,6.155,-1.45],
   [5.015,6.155,2.95],[5.015,3.33,3.80],
   [5.015,3.33,5.66]]
 }
};
export const ACH_MICH_BINDING_HEIGHT=.78;
export const ACH_MICH_CHIN_STRAP_HALF_WIDTH=.44;
export const achMichProfile=(shell:typeof ACH_MICH_SHELLS[number]):Profile=>
 PROFILES[shell];
const material=(hex:number)=>new THREE.MeshStandardMaterial({
 color:hex,roughness:.97,metalness:0,flatShading:true,
 side:THREE.DoubleSide
});
const hidden=(parent:THREE.Group,name:string):THREE.Group=>{
 const g=new THREE.Group();g.name=name;parent.add(g);return g;
};
/** One broad .78-high molded shell-color binding, not a thin black underline.
 * Front / sides / rear share endpoints. Segment center-line follows the
 * actual bottom perimeter, including the real high-cut gaps. */
export function createAchMichBindingGeometry(shell:typeof ACH_MICH_SHELLS[number]){
 const p=PROFILES[shell],data:number[]=[];
 const triangle=(a:Point,b:Point,c:Point)=>{
  data.push(...a,...b,...c);
 };
 const strip=(a:Point,b:Point,axis:'x'|'z')=>{
  const ext=.16;
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
/** ACH/MICH retention is mounted *inside* the shell. Only the exposed
 * webbing below the ear cut and nape is drawn. Never start the webbing on
 * the exterior screw face: that creates the green cage in H4 screenshots.
 * Compare the PASGT two-point retention and genuine ACH four-point H-back.
 */
export function achMichHemY(
 shell:typeof ACH_MICH_SHELLS[number],z:number):number{
 const hem=PROFILES[shell].hem;
 if(z<=hem[0][2])return hem[0][1];
 for(let i=1;i<hem.length;i++)if(z<=hem[i][2]){
  const a=hem[i-1],b=hem[i],span=b[2]-a[2];
  const u=span>1e-6?(z-a[2])/span:0;
  return a[1]+(b[1]-a[1])*u;
 }
 return hem[hem.length-1][1];
}
export function achMichRetentionPaths(
 shell:typeof ACH_MICH_SHELLS[number]):readonly (readonly Point[])[]{
 const p=PROFILES[shell],result:Point[][]=[];
 for(const sign of [-1,1] as const){
  // Inset ~.60 behind outer shell face, with uppermost ends tucked beneath
  // the protective rubber binding. Front and rear both descend from behind.
  const f:Point=[sign*4.49,achMichHemY(shell,p.frontStud[2])-.16,p.frontStud[2]];
  const b:Point=[sign*4.49,achMichHemY(shell,p.rearStud[2])-.16,p.rearStud[2]];
  // Two direct legs form a quiet V beneath each ear. The old extra rear
  // guide created a dangling horizontal projection in the side view.
  const junction:Point=[sign*3.92,1.22,-3.13];
  // PASGT-proportioned jaw offset: support the chin without projecting
  // an extra ribbon-length beyond the face silhouette in profile.
  const chin:Point=[sign*1.91,-.30,-4.48];
  result.push([f,junction],[b,junction],[junction,chin]);
 }
 return result;
}
/** The webbing and chin pad are one physical assembly of the same
 * material, as on the established PASGT system. The underside cup is
 * joined at the exact two end points of the left and right chin straps.
 */
export function createAchMichRetentionGeometry(
 shell:typeof ACH_MICH_SHELLS[number]):THREE.BufferGeometry{
 const data:number[]=[];
 const paths=achMichRetentionPaths(shell);
 for(let i=0;i<paths.length;i++){
  const sign=i<3?-1:1;
  // Rear leg stays flush to the side of the head. Front and under-jaw
  // legs turn toward camera so they remain substantial in front view,
  // instead of disappearing as an edge-on thread behind the face.
  const normal=i%3===1?new THREE.Vector3(sign,0,0):
   new THREE.Vector3(sign*.68,0,-.74);
  appendStrap(data,paths[i],normal,i%3===2?.44:.39);
 }
 // Overlapping junction patches cover the three sewn legs where their
 // differing face normals would otherwise leave a narrow triangular hole.
 // Deliberately use the same webbing/material batch, not a floating clasp.
 for(const sign of [-1,1] as const){
  const hub:Point=[sign*3.92,1.22,-3.13];
  const upper:Point=[sign*3.96,1.69,-3.12];
  const outer:Point=[sign*4.18,1.26,-3.28];
  const lower:Point=[sign*3.83,.83,-3.30];
  for(const v of [upper,outer,hub,outer,lower,hub,lower,upper,hub])
   data.push(...v);
 }
 const pt=(x:number,y:number,z:number):Point=>[x,y,z];
 const topLeft=pt(-1.91,-.30,-4.48),topMiddle=pt(0,-.26,-4.54),
  topRight=pt(1.91,-.30,-4.48);
 const lowLeft=pt(-1.91,-.78,-4.48),lowMiddle=pt(0,-.84,-4.54),
  lowRight=pt(1.91,-.78,-4.48);
 for(const v of [topLeft,lowMiddle,lowLeft,topLeft,topMiddle,lowMiddle,
  topMiddle,lowRight,lowMiddle,topMiddle,topRight,lowRight])data.push(...v);
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(data,3));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.achMichFourPoint=true;
 g.userData.belowShellAnchors=true;
 g.userData.integratedChinCup=true;
 g.userData.chinWidth=ACH_MICH_CHIN_STRAP_HALF_WIDTH*2;
 return g;
}
export function createAchMichDetails(parent:THREE.Group,id:string):AchMichDetailLayers{
 if(!(ACH_MICH_SHELLS as readonly string[]).includes(id))
  throw Error('ACH/MICH details require an ACH/MICH shell');
 const shell=id as typeof ACH_MICH_SHELLS[number];
 const p=PROFILES[shell];
 const bare=hidden(parent,id+'-integrated-rubber-edge-binding'),
  coveredLiner=hidden(parent,id+'-covered-inward-molded-shell-lip'),
  hardware=hidden(parent,id+'-uncovered-retention-anchors'),
  strap=hidden(parent,id+'-broad-four-point-retention');
 // Solid color, no normal-dependent brightness bands or faceted color steps.
 // Recolored with the same shell swatch ledger as the original trim.
 const bindingMaterial=new THREE.MeshBasicMaterial({
  color:0x67705f,side:THREE.DoubleSide,vertexColors:false
 });
 bindingMaterial.name='ach-mich-color-related-shell-binding';
 const edge=new THREE.Mesh(createAchMichBindingGeometry(shell),bindingMaterial);
 edge.name='ach-mich-rubber-shell-edge';edge.castShadow=false;
 edge.receiveShadow=false;bare.add(edge);
 // H10.0: a cover is textile over a protective shell, NOT an empty open
 // cardboard box. Only the inward, recessed dark lower shell is exposed
 // below the folded cover; its outward-painted binding remains hidden.
 const inside=createAchMichBindingGeometry(shell);
 const positions=inside.getAttribute('position') as THREE.BufferAttribute;
 for(let i=0;i<positions.count;i++){
  positions.setXYZ(i,positions.getX(i)*.925,
   positions.getY(i)-.22,positions.getZ(i)*.93);
 }
 inside.computeVertexNormals();inside.computeBoundingBox();
 const innerLip=new THREE.Mesh(inside,new THREE.MeshBasicMaterial({
  color:0x353b34,side:THREE.DoubleSide
 }));
 innerLip.name='inward-covered-helmet-protective-lip';
 innerLip.castShadow=false;innerLip.receiveShadow=false;
 coveredLiner.add(innerLip);coveredLiner.userData.h10SolidUnderCover=true;
 const metal=material(0x636d61);
 const studGeometry=new THREE.BoxGeometry(.24,.52,.52);
 for(const sign of [-1,1] as const)
  for(const bolt of [p.frontStud,p.rearStud]){
   const mesh=new THREE.Mesh(studGeometry,metal);
   mesh.name='ach-mich-retention-screw';
   // Keep the full screw face above the raised rubber edge binding.
   mesh.position.set(sign*(bolt[0]+.13),
    Math.max(bolt[1],achMichHemY(shell,bolt[2])+
     ACH_MICH_BINDING_HEIGHT+.29),bolt[2]);
   mesh.castShadow=false;mesh.receiveShadow=false;hardware.add(mesh);
  }
 const webbing=material(0x59654f);
 const main=new THREE.Mesh(createAchMichRetentionGeometry(shell),webbing);
 main.name='ach-mich-integrated-four-point-and-chin-cup';main.castShadow=false;
 main.receiveShadow=false;strap.add(main);
 // Large, readable clasp is seated on the continuous jaw webbing,
 // not suspended beside the face or drawn as an unsupported black dot.
 for(const sign of [-1,1]){
  const clasp=new THREE.Mesh(new THREE.BoxGeometry(.46,.42,.20),metal);
  clasp.name='fastened-four-point-adjustment-buckle';
  clasp.position.set(sign*3.52,.83,-3.56);
  clasp.rotation.y=sign*.30;
  clasp.castShadow=false;clasp.receiveShadow=false;strap.add(clasp);
 }
 // Keep each static material batched at creation; no global material/shader changes.
 consolidateVisualGroup(hardware);
 consolidateVisualGroup(strap);
 hardware.userData.achMichRetentionScrews=4;
 strap.userData.achMichFourPoint=true;
 return {bare,coveredLiner,hardware,strap,bindingMaterial,webbingMaterial:webbing};
}
export function updateAchMichDetails(layers:AchMichDetailLayers,
 covered:boolean,allowStrap:boolean):void{
 // The covered helmet displays its fitted cloth hem, not the bare-shell
 // molded rim that formerly bled through as a wide solid-colored stripe.
 layers.bare.visible=!covered;
 layers.coveredLiner.visible=covered;
 layers.hardware.visible=!covered;
 layers.strap.visible=allowStrap;
}
