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
type P=readonly [number,number,number];
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
 for(const sign of [-1,1] as const){
  const anchor=sign>0?M1_FIT_LANDMARKS.chinstrapRight:
   M1_FIT_LANDMARKS.chinstrapLeft;
  if(fastened){
   // Slightly asymmetric buckle, no large center padded chin cup.
   const joinX=sign>0?.72:-.72;
   ribbon([
    anchor,
    [sign*5.40,2.42,-2.71],
    [sign*4.15,.72,-3.68],
    [joinX,-.43,-4.08]
   ],.76);
  }else{
   ribbon([
    anchor,
    [sign*6.04,2.17,-1.60],
    [sign*5.82,.28,-1.77]
   ],.72);
  }
 }
 // One restrained buckle graphic in the SAME mesh/draw call.
 if(fastened)panel([.55,-.65,-4.16],[1.22,-.65,-4.16],
  [1.22,-.35,-4.16],[.55,-.35,-4.16],.50);
 else panel([5.56,.22,-1.84],[6.00,.22,-1.84],
  [6.00,.49,-1.84],[5.56,.49,-1.84],.50);
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 g.computeVertexNormals();g.computeBoundingBox();
 g.userData.m1TwoPieceChinstrap=true;
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
