/** B2-B — period Soviet SSh-40 two-piece canvas chinstrap.
 * +Y up, -Z forward, +X operator right, same canonical 8×8×8 head
 * mounting frame as the approved M1/PASGT/ACH/MICH. Geometry is authored
 * once, not reprojected or rebuilt per animation frame.
 *
 * Important: the M1/PASGT cheek stations are FIT REFERENCES only.
 * The SSh-40 has a simple two-point cloth strap with side rings and ONE
 * sliding buckle, never an ACH four-point harness or PASGT chin cup.
 */
import * as THREE from 'three';
import {M1_BLOCKING_FACEWEAR,m1RetentionPath}
 from './operator-m1-retention.ts';
import {achMichRetentionPaths} from './operator-ach-mich-details.ts';
export type Ssh40Chinstrap='fastened'|'unfastened';
export const SSH40_CHINSTRAP_STATES=['fastened','unfastened'] as const;
export const readSsh40Chinstrap=(v:unknown):Ssh40Chinstrap=>
 v==='unfastened'?'unfastened':'fastened';
export const ssh40RetentionAllowed=(facewear:string):boolean=>
 !(M1_BLOCKING_FACEWEAR as readonly string[]).includes(facewear);
type Point=readonly [number,number,number];
type Side=-1|1;
export const SSH40_RETENTION_ANCHOR:Point=[5.18,4.13,-1.10] as const;
export const SSH40_CHINSTRAP_WIDTH=.76;
/** Inset under the stamped lip; cloth emerges just below the lower skirt.
 * Points 1-4 deliberately inherit the already fixed M1/PASGT/ACH stations.
 * Shorter released left half and longer right half give the original slip
 * buckle arrangement instead of two dangling modern four-point suspensions.
 */
export function ssh40RetentionPath(sign:Side,mode:Ssh40Chinstrap):readonly Point[]{
 const anchor:Point=[sign*SSH40_RETENTION_ANCHOR[0],
  SSH40_RETENTION_ANCHOR[1],SSH40_RETENTION_ANCHOR[2]];
 if(mode==='unfastened')return [
  anchor,
  [sign*4.99,3.30,-1.12],
  [sign*5.06,1.43,-1.58],
  sign===1?[5.26,-1.17,-1.82]:[-5.18,-.12,-1.76]
 ];
 const m1=m1RetentionPath(sign,'fastened');
 const ach=achMichRetentionPaths('ach')[sign<0?2:5];
 // Defend the proven fit if these families ever change independently.
 if(m1[2][0]!==ach[1][0]||m1[3][0]!==ach[2][0])
  throw Error('SSh-40 cheek clearance requires approved M1 and ACH stations');
 return [anchor,...m1.slice(1)];
}
const webbing=(mode:Ssh40Chinstrap):THREE.BufferGeometry=>{
 const positions:number[]=[],colors:number[]=[];
 const add=(p:Point,tone:number)=>{
  positions.push(...p);colors.push(tone,tone,tone);
 };
 const ribbon=(path:readonly Point[],width:number)=>{
  for(let i=0;i<path.length-1;i++){
   const a=path[i],b=path[i+1],
    direction=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]).normalize();
   // Borrow the known head-outboard ribbon orientation from M1.
   const outside=new THREE.Vector3(Math.sign((a[0]+b[0])/2)*.66,0,-.75);
   const normal=new THREE.Vector3().crossVectors(outside,direction)
    .normalize().multiplyScalar(width/2);
   const side=(p:Point,sgn:number):Point=>[
    p[0]+normal.x*sgn,p[1]+normal.y*sgn,p[2]+normal.z*sgn];
   const pts=[side(a,1),side(a,-1),side(b,-1),
    side(a,1),side(b,-1),side(b,1)];
   for(const p of pts)add(p,i===0?.95:.98);
  }
 };
 for(const sign of [-1,1] as const)
  ribbon(ssh40RetentionPath(sign,mode),SSH40_CHINSTRAP_WIDTH);
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geo.computeVertexNormals();geo.computeBoundingBox();
 geo.userData.ssh40TwoPieceCanvas=true;
 geo.userData.ssh40ProvenJawClearance=true;
 geo.userData.ssh40ChinstrapRevision=1;
 geo.userData.ssh40Unfastened=mode==='unfastened';
 geo.userData.ssh40HasChinCup=false;
 return geo;
};
/** Deliberately chunky and readable at Studio zoom: two simple steel
 * attachment loops and ONE sliding buckle, without screws or faux rivets.
 * All hardware is below the shell lip rather than pinned through the
 * outward-painted sidewall. No model silhouette change.
 */
function hardware(parent:THREE.Group,fastened:boolean,
 metal:THREE.MeshStandardMaterial){
 const steel=new THREE.BoxGeometry(.17,.40,.18);
 for(const sign of [-1,1] as const){
  const loop=new THREE.Mesh(steel,metal);
  loop.name='ssh40-side-ring-tab';loop.position.set(sign*5.10,3.56,-1.18);
  loop.castShadow=false;loop.receiveShadow=false;
  parent.add(loop);
 }
 const buckle=new THREE.Mesh(
  new THREE.BoxGeometry(.44,.40,.13),metal);
 buckle.name='ssh40-period-slip-buckle';
 if(fastened)buckle.position.set(2.65,-.82,-4.47);
 else buckle.position.set(5.26,-1.03,-1.89);
 buckle.castShadow=false;buckle.receiveShadow=false;parent.add(buckle);
}
export type Ssh40RetentionLayers={
 fastened:THREE.Group;unfastened:THREE.Group;
 canvasMaterial:THREE.MeshStandardMaterial;
 hardwareMaterial:THREE.MeshStandardMaterial;
};
export function createSsh40RetentionLayers(parent:THREE.Group):Ssh40RetentionLayers{
 const canvasMaterial=new THREE.MeshStandardMaterial({
  color:0x8b7854,roughness:.99,metalness:0,
  vertexColors:true,flatShading:true,side:THREE.DoubleSide
 });
 canvasMaterial.userData.fieldworkStudioSoftGear=true;
 const hardwareMaterial=new THREE.MeshStandardMaterial({
  color:0x4a4d3d,roughness:.87,metalness:.07,flatShading:true
 });
 const state=(mode:Ssh40Chinstrap)=>{
  const group=new THREE.Group();group.name='ssh40-retention-'+mode;
  group.visible=false;
  const mesh=new THREE.Mesh(webbing(mode),canvasMaterial);
  mesh.name='ssh40-two-piece-canvas-'+mode;
  mesh.castShadow=false;mesh.receiveShadow=false;
  group.add(mesh);
  hardware(group,mode==='fastened',hardwareMaterial);
  parent.add(group);
  return group;
 };
 return {fastened:state('fastened'),unfastened:state('unfastened'),
  canvasMaterial,hardwareMaterial};
}
export function updateSsh40RetentionLayers(layers:Ssh40RetentionLayers,
 requested:unknown,facewear:string){
 const enabled=ssh40RetentionAllowed(facewear);
 const mode=readSsh40Chinstrap(requested);
 layers.fastened.visible=enabled&&mode==='fastened';
 layers.unfastened.visible=enabled&&mode==='unfastened';
}
