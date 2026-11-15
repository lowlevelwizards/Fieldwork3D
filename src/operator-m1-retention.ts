/** B1-B: M1 steel-pot, two-piece cotton web retention.
 * No chin cup, modern four-point rig, physical armor or new equipment item.
 * Both state geometries built once on the helmet head-local mount.
 */
import * as THREE from 'three';
import {M1_FIT_LANDMARKS} from './operator-m1-helmet-profile.ts';
export type M1Chinstrap='fastened'|'unfastened';
export const M1_CHINSTRAP_STATES=['fastened','unfastened'] as const;
export const readM1Chinstrap=(v:unknown):M1Chinstrap=>
 v==='unfastened'?'unfastened':'fastened';
export const M1_BLOCKING_FACEWEAR=[
 'gas-gp5','gas-m17','gas-m40','gas-m50','respirator-half','half-mask',
 'shemagh','bandana'
] as const;
export const m1RetentionAllowed=(facewear:string)=>!
 (M1_BLOCKING_FACEWEAR as readonly string[]).includes(facewear);
export type M1RetentionLayers={fastened:THREE.Group;unfastened:THREE.Group;
 material:THREE.MeshStandardMaterial;};
export type M1RetentionPoint=readonly [number,number,number];
type P=M1RetentionPoint;
/** Preserve the approved PASGT upper-temple and ACH/MICH cheek clearance.
 * The old M1 route went inside the 8×8 head box at X±3.85 / Z−3.68,
 * and put its buckle directly against the face at Y−.43 / Z−4.08.
 * The cheek MUST stay outside the side cube until Z<=−4.36, then run
 * BELOW the chin, without importing a modern four-point harness.
 */
export function m1RetentionPath(sign:-1|1,style:M1Chinstrap):readonly P[]{
 const anchor=sign>0?M1_FIT_LANDMARKS.chinstrapRight:
  M1_FIT_LANDMARKS.chinstrapLeft;
 if(style==='unfastened')return [
  anchor,
  [sign*5.06,1.43,-1.58], // approved ACH/MICH outboard released junction
  [sign*5.26,-1.17,-1.82] // hangs freely outside the head/neck
 ];
 return [
  anchor,
  [sign*4.99,3.30,-1.12], // approved PASGT upper webbing station
  [sign*4.46,.65,-4.36], // approved ACH/MICH cheek turn, ahead of face
  [sign*2.34,-1.08,-4.34], // proven low ACH/MICH under-chin point
  [sign*.18,-1.18,-4.47] // meet beneath jaw, not inside the face
 ];
}
function geometry(fastened:boolean):THREE.BufferGeometry{
 const coords:number[]=[],colors:number[]=[];
 const add=(p:P,tone:number)=>{coords.push(...p);colors.push(tone,tone,tone);};
 const panel=(a:P,b:P,c:P,d:P,tone=1)=>{
  for(const p of [a,b,c,a,c,d])add(p,tone);
 };
 const ribbon=(points:readonly P[],width:number)=>{
  for(let i=0;i<points.length-1;i++){
   const a=points[i],b=points[i+1];
   const along=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]).normalize();
   const outward=new THREE.Vector3(Math.sign((a[0]+b[0])/2)*.66,0,-.75);
   const half=new THREE.Vector3().crossVectors(outward,along)
    .normalize().multiplyScalar(width/2);
   const make=(p:P,sgn:number):P=>[
    p[0]+half.x*sgn,p[1]+half.y*sgn,p[2]+half.z*sgn];
   panel(make(a,1),make(a,-1),make(b,-1),make(b,1),.91);
  }
 };
 for(const sign of [-1,1] as const)
  ribbon(m1RetentionPath(sign,fastened?'fastened':'unfastened'),
   fastened?.76:.72);
 // Keep the one-piece low under-chin buckle with the *same* dark webbing.
 // Old buckle sat at the front of the head; now it meets both strap ends.
 if(fastened)panel([-.31,-1.39,-4.54],[.35,-1.39,-4.54],
  [.35,-1.06,-4.54],[-.31,-1.06,-4.54],.50);
 else panel([5.03,-1.32,-1.87],[5.48,-1.32,-1.87],
  [5.48,-1.00,-1.87],[5.03,-1.00,-1.87],.50);
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.m1TwoPieceChinstrap=true;
 g.userData.m1ProvenHeadClearance=true;
 g.userData.m1ChinstrapRouteRevision=5;
 g.userData.m1Unfastened=!fastened;
 return g;
}
export function createM1RetentionLayers(parent:THREE.Group):M1RetentionLayers{
 const material=new THREE.MeshStandardMaterial({
  color:0x695a41,roughness:.97,metalness:0,
  flatShading:true,vertexColors:true,side:THREE.DoubleSide
 });
 material.userData.fieldworkStudioSoftGear=true;
 const state=(id:M1Chinstrap)=>{
  const group=new THREE.Group();group.name='m1-strap-'+id;group.visible=false;
  const mesh=new THREE.Mesh(geometry(id==='fastened'),material);
  mesh.name='m1-two-piece-'+id;
  mesh.castShadow=false;mesh.receiveShadow=false;
  group.add(mesh);parent.add(group);return group;
 };
 return {fastened:state('fastened'),unfastened:state('unfastened'),material};
}
export function updateM1RetentionLayers(v:M1RetentionLayers,
 requested:unknown,facewear:string){
 const enabled=m1RetentionAllowed(facewear);
 const style=readM1Chinstrap(requested);
 v.fastened.visible=enabled&&style==='fastened';
 v.unfastened.visible=enabled&&style==='unfastened';
}
