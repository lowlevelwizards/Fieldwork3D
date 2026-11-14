/** H3 ACH/MICH physical edge binding, correctly placed suspension screws,
 * and PASGT-weight four-point retention. One static assembly per helmet;
 * no per-frame geometry or texture allocation. -Z is the face.
 */
import * as THREE from 'three';
import {ACH_MICH_SHELLS} from './operator-headwear-silhouettes.ts';
import {UNIFIED_HELMET_HEMS}
 from './operator-ach-mich-unified-shell.ts';
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
  side:5.075,front:-5.535,rear:5.60,brow:4.40,nape:2.72,
  frontStud:[5.075,4.95,-3.12],rearStud:[5.075,2.58,1.86],
  hem:UNIFIED_HELMET_HEMS.ach
 },
 'mich-2002':{
  side:5.03,front:-5.70,rear:5.75,brow:4.55,nape:3.82,
  frontStud:[5.03,5.10,-3.10],rearStud:[5.03,4.37,3.05],
  hem:UNIFIED_HELMET_HEMS['mich-2002']
 },
 'mich-2001':{
  side:5.015,front:-5.71,rear:5.66,brow:4.55,nape:3.33,
  frontStud:[5.065,6.495,-3.16],rearStud:[5.015,3.91,3.79],
  hem:[[5.015,4.55,-5.71],[5.065,6.025,-4.60],
   [5.065,6.025,-1.96],[5.015,6.155,-1.45],
   [5.015,6.155,2.95],[5.015,3.33,3.80],
   [5.015,3.33,5.66]]
 }
};
// Legacy tall edge is retained on the untouched high-cut shell.
export const ACH_MICH_BINDING_HEIGHT=.78;
// H18: Full/Mid use a smaller edge that follows the shell as finishing
// rather than a second armor skirt. Evaluated only at mesh creation.
export const achMichBindingHeight=(
 shell:typeof ACH_MICH_SHELLS[number]):number=>
 shell==='mich-2001'?ACH_MICH_BINDING_HEIGHT:.52;
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
/** One continuous molded shell-color edge, without added contour layers.
 * H18 reduces its height on Full/Mid; High-Cut remains unchanged.
 * Front/sides/rear share exact endpoints. */
export function createAchMichBindingGeometry(shell:typeof ACH_MICH_SHELLS[number]){
 const p=PROFILES[shell],data:number[]=[],
  bindingHeight=achMichBindingHeight(shell);
 const triangle=(a:Point,b:Point,c:Point)=>{
  data.push(...a,...b,...c);
 };
 const strip=(a:Point,b:Point,axis:'x'|'z')=>{
  const ext=.16;
  const start:Point=axis==='x'?[a[0]+Math.sign(a[0])*ext,a[1],a[2]]:
   [a[0],a[1],a[2]+(a[2]<0?-ext:ext)];
  const end:Point=axis==='x'?[b[0]+Math.sign(b[0])*ext,b[1],b[2]]:
   [b[0],b[1],b[2]+(b[2]<0?-ext:ext)];
  const raise=(v:Point):Point=>[v[0],v[1]+bindingHeight,v[2]];
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
 g.userData.minimumHeight=bindingHeight;
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
  // Retain the two ACH/MICH shell suspension legs. The *direct* junction
  // to chin diagonal crossed the 8x8 head cube: midway it had |x|<4 AND
  // z>-4. PASGT avoids this with an outboard cheek station before it
  // turns inward on the front side of the face.
  const junction:Point=[sign*4.56,1.37,-2.91];
  // Pull both forward cheek corners inboard by .17 and back by .08.
  // The full webbing ribbon still clears the -4 front / +/-4 side head box.
  const cheekDrop:Point=[sign*4.46,.65,-4.36];
  // Preserve the PASGT-like front chin cup and all shell anchor stations.
  // Only the two cheek bends above it move in this fit pass.
  const chin:Point=[sign*2.34,-1.08,-4.34];
  result.push([f,junction],[b,junction],[junction,cheekDrop,chin]);
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
 // PASGT-style shared plane: broad uninterrupted webbing, without the
 // oversized triangular hub patches that intersected the cheek silhouette.
 for(let i=0;i<paths.length;i++){
  const sign=i<3?-1:1;
  appendStrap(data,paths[i],new THREE.Vector3(sign*.68,0,-.74),.39);
 }
 // Join at the exact two chin endpoints, without a second overlapping
 // junction. The cup's top edge is just below the known -1 skull bottom.
 const leftChin=paths[2][2],rightChin=paths[5][2];
 const pad:Point[]=[
  [leftChin[0],leftChin[1]-.51,leftChin[2]],
  [rightChin[0],rightChin[1]-.51,rightChin[2]],
  rightChin,leftChin
 ];
 for(const i of [0,1,2,0,2,3])data.push(...pad[i]);
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
     achMichBindingHeight(shell)+.29),bolt[2]);
   mesh.castShadow=false;mesh.receiveShadow=false;hardware.add(mesh);
  }
 const webbing=material(0x59654f);
 const main=new THREE.Mesh(createAchMichRetentionGeometry(shell),webbing);
 main.name='ach-mich-integrated-four-point-and-chin-cup';main.castShadow=false;
 main.receiveShadow=false;strap.add(main);
 // At gameplay distance the buckle only needs an outboard silhouette.
 // Replace two 12-triangle 3D boxes with two double-sided flat quads in one
 // static geometry: 4 triangles total, one draw call, no hidden side faces.
 const claspVertices:number[]=[];
 for(const sign of [-1,1]){
  const x=sign*4.69,y=1.10,z=-3.03;
  const a:Point=[x,y-.21,z-.18],b:Point=[x,y-.21,z+.18],
   c:Point=[x,y+.21,z+.18],d:Point=[x,y+.21,z-.18];
  for(const p of [a,b,c,a,c,d])claspVertices.push(...p);
 }
 const claspGeometry=new THREE.BufferGeometry();
 claspGeometry.setAttribute('position',
  new THREE.Float32BufferAttribute(claspVertices,3));
 claspGeometry.computeVertexNormals();
 const clasps=new THREE.Mesh(claspGeometry,metal);
 clasps.name='fastened-four-point-adjustment-buckle';
 clasps.userData.buckleFaces=4;
 clasps.userData.buckleCount=2;
 clasps.castShadow=false;clasps.receiveShadow=false;strap.add(clasps);
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
